import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * 元素是否进入过视口（一旦进入就不再变回 false，避免来回切换触发重复请求）。
 * 不传 root 时用视口；用于评论楼层滚动到附近再拉取子回复。
 */
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "200px",
): boolean {
  const [inView, setInView] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      done.current = true;
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          done.current = true;
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}
