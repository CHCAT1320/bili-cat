import { useLayoutEffect, useRef, type RefObject } from "react";

interface Anchor {
  generation: number;
  node: HTMLElement | null;
  top: number;
}

function absoluteTop(node: HTMLElement): number {
  return node.getBoundingClientRect().top + window.scrollY;
}

/**
 * 列表从头部裁掉旧数据时，网格总高度可能不变、内容却整体上移（每追加一批就裁掉等量旧数据）。
 * 因此以「最后一张卡片」为锚点，比较它在文档中的绝对位置变化来补偿滚动，保持视口稳定。
 * generation 变化代表刷新，此时直接回到顶部。
 */
export function useScrollAnchor(
  containerRef: RefObject<HTMLElement | null>,
  generation: number,
  lastKey: string | undefined,
  count: number,
): void {
  const anchor = useRef<Anchor | null>(null);

  useLayoutEffect(() => {
    const grid = containerRef.current;
    if (!grid) return;

    const previous = anchor.current;
    if (previous && previous.generation !== generation) {
      window.scrollTo({ top: 0 });
    } else if (previous?.node?.isConnected) {
      const delta = absoluteTop(previous.node) - previous.top;
      if (delta !== 0) window.scrollBy(0, delta);
    }

    const node = grid.lastElementChild as HTMLElement | null;
    anchor.current = {
      generation,
      node,
      top: node ? absoluteTop(node) : 0,
    };
  }, [containerRef, generation, lastKey, count]);
}
