import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { toDynamic, type DynamicFeed, type DynamicItem } from "../bilibili/dynamic";
import type { LoadStatus } from "./status";

export type DynamicMode = "following" | "hot";

export interface DynamicFeedState {
  items: DynamicItem[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

function mapFeed(data: DynamicFeed | null): DynamicItem[] {
  return (data?.items ?? [])
    .map(toDynamic)
    .filter((item): item is DynamicItem => Boolean(item));
}

export function useDynamicFeed(
  mode: DynamicMode,
  enabled: boolean,
): DynamicFeedState {
  const [items, setItems] = useState<DynamicItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const offset = useRef("");
  const page = useRef(0);
  const runId = useRef(0);
  const busy = useRef(false);

  const fetchPage = useCallback(
    async (target: number): Promise<DynamicFeed | null> => {
      if (mode === "hot") {
        return client.request<DynamicFeed>(API.dynamic.info.hot_dynamics, {
          params: { page: target },
        });
      }
      return client.request<DynamicFeed>(API.dynamic.info.dynamic_page_info, {
        params: {
          type: "all",
          page: target,
          timezone_offset: -480,
          offset: target === 1 ? "" : offset.current,
        },
      });
    },
    [mode],
  );

  const reset = useCallback(() => {
    if (!enabled) {
      setItems([]);
      setStatus("ready");
      setHasMore(false);
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    offset.current = "";
    page.current = 1;
    busy.current = false;
    setItems([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);

    void fetchPage(1)
      .then((data) => {
        if (run !== runId.current) return;
        const list = mapFeed(data);
        offset.current = data?.offset ?? "";
        setItems(list);
        setHasMore(list.length > 0 && Boolean(data?.has_more));
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    const run = runId.current;
    const next = page.current + 1;
    setLoadingMore(true);
    setErrorMore("");

    void fetchPage(next)
      .then((data) => {
        if (run !== runId.current) return;
        page.current = next;
        const list = mapFeed(data);
        offset.current = data?.offset ?? offset.current;
        setItems((prev) => [
          ...prev,
          ...list.filter((item) => !prev.some((old) => old.id === item.id)),
        ]);
        setHasMore(list.length > 0 && Boolean(data?.has_more));
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        busy.current = false;
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
