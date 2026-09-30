import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { searchToCard, type SearchResult, type VideoCardData } from "../bilibili/feed";
import type { SearchDuration, SearchOrder } from "../bilibili/search";
import type { LoadStatus } from "./status";

export interface VideoSearch {
  items: VideoCardData[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  total: number;
  loadMore: () => void;
  retry: () => void;
}

export function useVideoSearch(
  keyword: string,
  order: SearchOrder,
  duration: SearchDuration,
): VideoSearch {
  const [items, setItems] = useState<VideoCardData[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const page = useRef(0);
  const runId = useRef(0);
  const seen = useRef(new Set<string>());
  const appending = useRef(false);

  const fetchPage = useCallback(async () => {
    page.current += 1;
    const data = await client.request<SearchResult>(
      API.search.search.web_search_by_type,
      {
        params: {
          keyword,
          search_type: "video",
          page: page.current,
          order,
          duration,
        },
      },
    );
    const list = (data.result ?? []).map(searchToCard);
    setTotal(data.numResults ?? 0);
    if ((data.numPages ?? 0) <= page.current) setHasMore(false);
    return list;
  }, [keyword, order, duration]);

  const takeFresh = useCallback((batch: VideoCardData[]) => {
    const fresh = batch.filter((video) => !seen.current.has(video.bvid));
    for (const video of fresh) seen.current.add(video.bvid);
    return fresh;
  }, []);

  const reset = useCallback(() => {
    const id = runId.current + 1;
    runId.current = id;
    page.current = 0;
    seen.current = new Set();
    appending.current = false;
    setItems([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);
    setLoadingMore(false);
    setTotal(0);

    void fetchPage()
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
  }, [fetchPage, takeFresh]);

  const loadMore = useCallback(() => {
    if (appending.current || !hasMore) return;
    appending.current = true;
    const id = runId.current;
    setLoadingMore(true);
    setErrorMore("");

    void fetchPage()
      .then((batch) => {
        if (id !== runId.current) return;
        const fresh = takeFresh(batch);
        if (fresh.length === 0) {
          setHasMore(false);
          return;
        }
        setItems((prev) => [...prev, ...fresh]);
      })
      .catch((cause: unknown) => {
        if (id !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        appending.current = false;
        if (id === runId.current) setLoadingMore(false);
      });
  }, [fetchPage, hasMore, takeFresh]);

  useEffect(() => {
    if (keyword) reset();
  }, [keyword, reset]);

  return {
    items,
    status,
    error,
    errorMore,
    hasMore,
    loadingMore,
    total,
    loadMore,
    retry: reset,
  };
}
