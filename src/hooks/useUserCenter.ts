import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { coverUrl, type VideoCardData } from "../bilibili/feed";
import {
  toFolder,
  toFollowCard,
  toVideoCard,
  type FavoriteFolder,
  type FavoriteFolderList,
} from "../bilibili/userCenter";
import type { UserCardData } from "../bilibili/users";
import type { LoadStatus } from "./status";

const PAGE_SIZE = 20;

export interface PagedList<T> {
  items: T[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

/**
 * 收藏/历史/稍后再看/关注 都是「取一页、可续取」的同一形状，
 * 抽一个内部通用实现，避免四份几乎相同的状态机。
 */
function usePagedList<T>(
  load: (page: number) => Promise<{ items: T[]; hasMore: boolean }>,
  enabled: boolean,
  key: string,
): PagedList<T> {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(0);
  const runId = useRef(0);
  const appending = useRef(false);
  const loader = useRef(load);
  loader.current = load;

  const reset = useCallback(() => {
    if (!enabled) {
      setItems([]);
      setStatus("ready");
      setError("");
      setErrorMore("");
      setHasMore(false);
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    page.current = 1;
    appending.current = false;
    setItems([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);
    setLoadingMore(false);

    void loader
      .current(1)
      .then((result) => {
        if (run !== runId.current) return;
        setItems(result.items);
        setHasMore(result.hasMore);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [enabled, key]);

  const loadMore = useCallback(() => {
    if (appending.current || !hasMore) return;
    appending.current = true;
    const run = runId.current;
    const next = page.current + 1;
    setLoadingMore(true);
    setErrorMore("");

    void loader
      .current(next)
      .then((result) => {
        if (run !== runId.current) return;
        page.current = next;
        if (result.items.length === 0) {
          setHasMore(false);
          return;
        }
        setItems((prev) => [...prev, ...result.items]);
        setHasMore(result.hasMore);
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        appending.current = false;
        if (run === runId.current) setLoadingMore(false);
      });
  }, [hasMore]);

  useEffect(() => {
    reset();
  }, [reset]);

  return {
    items,
    status,
    error,
    errorMore,
    hasMore,
    loadingMore,
    loadMore,
    retry: reset,
  };
}

export function useFavoriteFolders(mid: number, enabled: boolean) {
  return usePagedList<FavoriteFolder>(
    async () => {
      const data = await client.request<FavoriteFolderList>(
        API.common.favorite.get_favorite_list,
        { params: { up_mid: mid } },
      );
      const items = (data.list ?? [])
        .map(toFolder)
        .filter((folder) => folder.id > 0);

      // list-all 对部分收藏夹不返回 cover，用夹内第一条视频的封面兜底
      const missing = items.filter(
        (folder) => !folder.cover && folder.mediaCount > 0,
      );
      await Promise.all(
        missing.map(async (folder) => {
          try {
            const content = await client.request<{ medias?: unknown[] }>(
              API.common.favorite.get_favorite_list_content,
              { params: { media_id: folder.id, ps: 1, pn: 1 } },
            );
            const first = (content.medias ?? [])[0] as
              | Record<string, unknown>
              | undefined;
            const cover = coverUrl(String(first?.cover ?? first?.pic ?? ""));
            if (cover) folder.cover = cover;
          } catch {
            /* 取不到封面就让卡片显示占位 */
          }
        }),
      );

      return { items, hasMore: false };
    },
    enabled && mid > 0,
    `folders-${mid}`,
  );
}

export function useFavoriteContent(mediaId: number, enabled: boolean) {
  return usePagedList<VideoCardData>(
    async (page) => {
      const data = await client.request<{ medias?: unknown[]; has_more?: boolean }>(
        API.common.favorite.get_favorite_list_content,
        { params: { media_id: mediaId, ps: PAGE_SIZE, pn: page } },
      );
      const items = (data.medias ?? [])
        .map((raw) => toVideoCard(raw as Record<string, unknown>))
        .filter((item): item is VideoCardData => Boolean(item));
      return { items, hasMore: Boolean(data.has_more) && items.length > 0 };
    },
    enabled && mediaId > 0,
    `fav-${mediaId}`,
  );
}

export function useToview(enabled: boolean) {
  return usePagedList<VideoCardData>(
    async () => {
      const data = await client.request<{ list?: unknown[] }>(
        API.toview.info.list,
        {},
      );
      const items = (data.list ?? [])
        .map((raw) => toVideoCard(raw as Record<string, unknown>))
        .filter((item): item is VideoCardData => Boolean(item));
      return { items, hasMore: false };
    },
    enabled,
    "toview",
  );
}

export function useWatchHistory(enabled: boolean) {
  const cursor = useRef<{ max: number; viewAt: number } | null>(null);
  return usePagedList<VideoCardData>(
    async () => {
      const params: Record<string, unknown> = { ps: PAGE_SIZE, business: "" };
      if (cursor.current) {
        params.max = cursor.current.max;
        params.view_at = cursor.current.viewAt;
      } else {
        params.max = 0;
        params.view_at = 0;
      }
      const data = await client.request<{
        cursor?: { max?: number; view_at?: number };
        list?: unknown[];
      }>(API.user.info.history_new, { params });
      cursor.current = {
        max: data.cursor?.max ?? 0,
        viewAt: data.cursor?.view_at ?? 0,
      };
      const items = (data.list ?? [])
        .map((raw) => toVideoCard(raw as Record<string, unknown>))
        .filter((item): item is VideoCardData => Boolean(item));
      return { items, hasMore: items.length > 0 };
    },
    enabled,
    "history",
  );
}

export function useFollowings(mid: number, enabled: boolean) {
  return usePagedList<UserCardData>(
    async (page) => {
      const data = await client.request<{ list?: unknown[] }>(
        API.user.info.followings,
        { params: { vmid: mid, ps: PAGE_SIZE, pn: page, order: "desc" } },
      );
      const items = (data.list ?? []).map((raw) =>
        toFollowCard(raw as Record<string, unknown>),
      );
      return { items, hasMore: items.length > 0 };
    },
    enabled && mid > 0,
    `followings-${mid}`,
  );
}
