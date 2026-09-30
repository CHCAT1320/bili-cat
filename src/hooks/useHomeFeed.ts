import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import {
  feedToCard,
  isVideoItem,
  type Feed,
  type VideoCardData,
} from "../bilibili/feed";
import type { LoadStatus } from "./status";

const PAGE_SIZE = 24;
/** 列表上限：超出后从头部裁掉旧数据，避免 DOM 与内存无限增长 */
const MAX_ITEMS = 240;

export interface HomeFeed {
  items: VideoCardData[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  generation: number;
  refresh: () => void;
  loadMore: () => void;
}

export function useHomeFeed(): HomeFeed {
  const [items, setItems] = useState<VideoCardData[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [generation, setGeneration] = useState(0);
  const runId = useRef(0);
  const freshIdx = useRef(0);
  const seen = useRef(new Set<string>());
  const appending = useRef(false);

  const fetchBatch = useCallback(async () => {
    freshIdx.current += 1;
    const feed = await client.request<Feed>(API.homepage.info.videos, {
      params: {
        ps: PAGE_SIZE,
        fresh_type: 3,
        fresh_idx: freshIdx.current,
        feed_version: "V8",
        homepage_ver: 1,
      },
    });
    return (feed.item ?? []).filter(isVideoItem).map(feedToCard);
  }, []);

  const takeFresh = useCallback((batch: VideoCardData[]) => {
    const fresh = batch.filter((video) => !seen.current.has(video.bvid));
    for (const video of fresh) seen.current.add(video.bvid);
    return fresh;
  }, []);

  const refresh = useCallback(() => {
    const id = runId.current + 1;
    runId.current = id;
    seen.current = new Set();
    freshIdx.current = 0;
    appending.current = false;
    setGeneration((value) => value + 1);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);
    setLoadingMore(false);

    void fetchBatch()
      .then((batch) => {
        if (id !== runId.current) return;
        setItems(takeFresh(batch));
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (id !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [fetchBatch, takeFresh]);

  const loadMore = useCallback(() => {
    if (appending.current || !hasMore) return;
    appending.current = true;
    const id = runId.current;
    setLoadingMore(true);
    setErrorMore("");

    void fetchBatch()
      .then((batch) => {
        if (id !== runId.current) return;
        const fresh = takeFresh(batch);
        if (fresh.length === 0) {
          setHasMore(false);
          return;
        }
        setItems((prev) => {
          const next = [...prev, ...fresh];
          return next.length > MAX_ITEMS
            ? next.slice(next.length - MAX_ITEMS)
            : next;
        });
      })
      .catch((cause: unknown) => {
        if (id !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        appending.current = false;
        if (id === runId.current) setLoadingMore(false);
      });
  }, [fetchBatch, hasMore, takeFresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    items,
    status,
    error,
    errorMore,
    hasMore,
    loadingMore,
    generation,
    refresh,
    loadMore,
  };
}
