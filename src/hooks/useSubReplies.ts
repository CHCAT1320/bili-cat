import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSubReplies, type CommentItem } from "../bilibili/comment";

export interface SubReplies {
  items: CommentItem[];
  loading: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

const PAGE_SIZE = 20;

/** 进入视口后再拉取子评论；enabled 由调用方（IntersectionObserver）控制 */
export function useSubReplies(
  aid: number,
  root: string,
  enabled = true,
): SubReplies {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const page = useRef(0);
  const runId = useRef(0);
  const busy = useRef(false);
  const started = useRef(false);

  const load = useCallback(
    async (target: number) => {
      if (busy.current || !aid || !root) return;
      busy.current = true;
      const run = runId.current + 1;
      runId.current = run;
      setLoading(true);
      setError("");
      try {
        const { items: list } = await fetchSubReplies(
          aid,
          root,
          target,
          PAGE_SIZE,
        );
        if (run !== runId.current) return;
        page.current = target;
        setItems((prev) =>
          target === 1
            ? list
            : [
                ...prev,
                ...list.filter(
                  (item) => !prev.some((old) => old.rpid === item.rpid),
                ),
              ],
        );
        setHasMore(list.length >= PAGE_SIZE);
      } catch (cause) {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        busy.current = false;
        if (run === runId.current) setLoading(false);
      }
    },
    [aid, root],
  );

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore) return;
    void load(page.current + 1);
  }, [hasMore, load]);

  const reload = useCallback(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    setItems([]);
    setHasMore(false);
    setError("");
    page.current = 0;
    started.current = false;
  }, [aid, root]);

  useEffect(() => {
    // 只在首次进入视口时自动加载，之后靠「查看更多回复」翻页
    if (!enabled || started.current || !aid || !root) return;
    started.current = true;
    void load(1);
  }, [enabled, aid, root, load]);

  return { items, loading, error, hasMore, loadMore, reload };
}
