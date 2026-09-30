import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { userToCard, type UserCardData, type UserSearchResult } from "../bilibili/users";
import type { LoadStatus } from "./status";

export interface UserSearch {
  users: UserCardData[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  hasMore: boolean;
  loadingMore: boolean;
  total: number;
  loadMore: () => void;
  retry: () => void;
}

export function useUserSearch(keyword: string): UserSearch {
  const [users, setUsers] = useState<UserCardData[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const page = useRef(0);
  const runId = useRef(0);
  const seen = useRef(new Set<number>());
  const appending = useRef(false);

  const fetchPage = useCallback(async () => {
    page.current += 1;
    const data = await client.request<UserSearchResult>(
      API.search.search.web_search_by_type,
      {
        params: {
          keyword,
          search_type: "bili_user",
          page: page.current,
        },
      },
    );
    setTotal(data.numResults ?? 0);
    if ((data.numPages ?? 0) <= page.current) setHasMore(false);
    return (data.result ?? []).map(userToCard);
  }, [keyword]);

  const takeFresh = useCallback((batch: UserCardData[]) => {
    const fresh = batch.filter((user) => !seen.current.has(user.mid));
    for (const user of fresh) seen.current.add(user.mid);
    return fresh;
  }, []);

  const reset = useCallback(() => {
    const run = runId.current + 1;
    runId.current = run;
    page.current = 0;
    seen.current = new Set();
    appending.current = false;
    setUsers([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setHasMore(true);
    setLoadingMore(false);
    setTotal(0);

    void fetchPage()
      .then((batch) => {
        if (run !== runId.current) return;
        setUsers(takeFresh(batch));
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [fetchPage, takeFresh]);

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
        setUsers((prev) => [...prev, ...fresh]);
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
    if (keyword) reset();
  }, [keyword, reset]);

  return {
    users,
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
