import { useEffect, useRef } from "react";

export function useInfiniteScroll(onReachEnd: () => void, enabled: boolean) {
  const target = useRef<HTMLDivElement | null>(null);
  const handler = useRef(onReachEnd);

  useEffect(() => {
    handler.current = onReachEnd;
  }, [onReachEnd]);

  useEffect(() => {
    const node = target.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) handler.current();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return target;
}
