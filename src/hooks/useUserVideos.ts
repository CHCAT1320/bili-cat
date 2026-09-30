import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { coverUrl } from "../bilibili/feed";
import type { SpaceVideo, SpaceVideoList } from "../bilibili/users";
import type { LoadStatus } from "./status";

const PAGE_SIZE = 30;

export interface UserVideos {
  videos: SpaceVideo[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

/** 投稿列表接口（space/wbi/arc/search）会间歇性返回 -412，客户端已做退避重试 */
export function useUserVideos(mid: number): UserVideos {
  const [videos, setVideos] = useState<SpaceVideo[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(0);
  const runId = useRef(0);
  const seen = useRef(new Set<string>());
  const appending = useRef(false);

  const fetchPage = useCallback(async () => {
    page.current += 1;
    const data = await client.request<{ page?: { count?: number }; list?: SpaceVideoList }>(
      API.user.info.video,
      { params: { mid, ps: PAGE_SIZE, pn: page.current, order: "pubdate" } },
    );
    const total = data.page?.count ?? 0;
    const batch = (data.list?.vlist ?? []).map((video) => ({
      ...video,
      pic: coverUrl(video.pic ?? ""),
    }));
    if (total > 0 && page.current * PAGE_SIZE >= total) setHasMore(false);
    return batch;
  }, [mid]);

  const takeFresh = useCallback((batch: SpaceVideo[]) => {
    const fresh = batch.filter((video) => !seen.current.has(video.bvid));
    for (const video of fresh) seen.current.add(video.bvid);
    return fresh;
  }, []);

  const reset = useCallback(() => {
    if (!mid) {
      setError("缺少 mid");
      setStatus("error");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    page.current = 0;
    seen.current = new Set();
    appending.current = false;
    setVideos([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);
    setLoadingMore(false);

    void fetchPage()
      .then((batch) => {
        if (run !== runId.current) return;
        setVideos(takeFresh(batch));
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [fetchPage, mid, takeFresh]);

  const loadMore = useCallback(() => {
    if (appending.current || !hasMore) return;
    appending.current = true;
    const run = runId.current;
    setLoadingMore(true);
    setErrorMore("");

    void fetchPage()
      .then((batch) => {
        if (run !== runId.current) return;
        const fresh = takeFresh(batch);
        if (fresh.length === 0) {
          setHasMore(false);
          return;
        }
        setVideos((prev) => [...prev, ...fresh]);
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        appending.current = false;
        if (run === runId.current) setLoadingMore(false);
      });
  }, [fetchPage, hasMore, takeFresh]);

  useEffect(() => {
    reset();
  }, [reset]);

  return {
    videos,
    status,
    error,
    errorMore,
    hasMore,
    loadingMore,
    loadMore,
    retry: reset,
  };
}
