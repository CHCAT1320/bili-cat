import { useCallback, useEffect, useRef, useState } from "react";
import { fetchComments, sendComment, type CommentItem } from "../bilibili/comment";
import type { LoadStatus } from "./status";

export interface Comments {
  items: CommentItem[];
  status: LoadStatus;
  error: string;
  errorMore: string;
  total: number;
  hasMore: boolean;
  loadingMore: boolean;
  posting: boolean;
  postError: string;
  /** 0 按时间，2 按热度 */
  sort: number;
  setSort: (sort: number) => void;
  loadMore: () => void;
  reload: () => void;
  send: (message: string) => Promise<boolean>;
}

const PAGE_SIZE = 20;

export function useComments(aid: number): Comments {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [errorMore, setErrorMore] = useState("");
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [sort, setSort] = useState(2);
  const page = useRef(0);
  const runId = useRef(0);
  const appending = useRef(false);

  const reload = useCallback(() => {
    if (!aid) return;
    const run = runId.current + 1;
    runId.current = run;
    page.current = 1;
    appending.current = false;
    setItems([]);
    setStatus("loading");
    setError("");
    setErrorMore("");
    setTotal(0);
    setHasMore(true);

    void fetchComments(aid, 1, sort, PAGE_SIZE)
      .then(({ items: list, count }) => {
        if (run !== runId.current) return;
        setItems(list);
        setTotal(count);
        setHasMore(list.length > 0);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [aid, sort]);

  const loadMore = useCallback(() => {
    if (appending.current || !hasMore) return;
    appending.current = true;
    const run = runId.current;
    const next = page.current + 1;
    setLoadingMore(true);
    setErrorMore("");

    void fetchComments(aid, next, sort, PAGE_SIZE)
      .then(({ items: list }) => {
        if (run !== runId.current) return;
        page.current = next;
        setItems((prev) => [
          ...prev,
          ...list.filter((item) => !prev.some((old) => old.rpid === item.rpid)),
        ]);
        if (list.length === 0) setHasMore(false);
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setErrorMore(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        appending.current = false;
        if (run === runId.current) setLoadingMore(false);
      });
  }, [aid, hasMore, sort]);

  const send = useCallback(
    async (message: string) => {
      if (!aid || !message.trim()) return false;
      setPosting(true);
      setPostError("");
      try {
        await sendComment(aid, message);
        reload();
        return true;
      } catch (cause) {
        setPostError(cause instanceof Error ? cause.message : String(cause));
        return false;
      } finally {
        setPosting(false);
      }
    },
    [aid, reload],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items,
    status,
    error,
    errorMore,
    total,
    hasMore,
    loadingMore,
    posting,
    postError,
    sort,
    setSort,
    loadMore,
    reload,
    send,
  };
}
