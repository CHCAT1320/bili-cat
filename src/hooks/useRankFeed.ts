import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { feedToCard, type FeedVideo, type VideoCardData } from "../bilibili/feed";
import type { LoadStatus } from "./status";

const PAGE_SIZE = 30;

export const RANK_TABS = ["popular", "ranking"] as const;

export type RankTab = (typeof RANK_TABS)[number];

export interface RankFeed {
  items: VideoCardData[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

/** 热门分页加载，排行榜一次性返回 */
export function useRankFeed(tab: RankTab): RankFeed {
  const [items, setItems] = useState<VideoCardData[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useRef(0);
  const runId = useRef(0);
  const appending = useRef(false);

  const fetchPage = useCallback(async () => {
    page.current += 1;
    if (tab === "ranking") {
      const data = await client.request<{ list?: FeedVideo[] }>(
        API.rank.info.v2_ranking,
        { params: { rid: 0, type: "all" } },
      );
      setHasMore(false);
      return (data.list ?? []).map(feedToCard);
    }
    const data = await client.request<{ list?: FeedVideo[] }>(
      API.rank.info.hot,
      { params: { ps: PAGE_SIZE, pn: page.current } },
    );
    if ((data.list ?? []).length < PAGE_SIZE) setHasMore(false);
    return (data.list ?? []).map(feedToCard);
  }, [tab]);

  const reset = useCallback(() => {
    const run = runId.current + 1;
    runId.current = run;
    page.current = 0;
    appending.current = false;
    setItems([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);
    setLoadingMore(false);

    void fetchPage()
      .then((batch) => {
        if (run !== runId.current) return;
        setItems(batch);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (appending.current || !hasMore) return;
    appending.current = true;
    const run = runId.current;
    setLoadingMore(true);
    setErrorMore("");

    void fetchPage()
      .then((batch) => {
        if (run !== runId.current) return;
        if (batch.length === 0) {
          setHasMore(false);
          return;
        }
        setItems((prev) => {
          const seen = new Set(prev.map((item) => item.bvid));
          return [...prev, ...batch.filter((item) => !seen.has(item.bvid))];
        });
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        appending.current = false;
        if (run === runId.current) setLoadingMore(false);
      });
  }, [fetchPage, hasMore]);

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
