import { useEffect, useRef } from "react";
import type { DanmakuItem } from "../bilibili/danmaku";
import "./DanmakuLayer.css";

/** 滚动弹幕横穿屏幕所需秒数 */
const SCROLL_DURATION = 8;
/** 顶部/底部弹幕停留秒数 */
const STATIC_DURATION = 4;
/** 同屏上限，防止大弹幕量时 DOM 爆炸 */
const MAX_ACTIVE = 200;
/** 固定轨道高度：不再按每条字号改变，否则不同字号的弹幕轨道会互相穿插 */
const LANE_HEIGHT = 30;

interface ActiveItem {
  node: HTMLDivElement;
  item: DanmakuItem;
  width: number;
  speed: number;
  /** 1 正向（右→左），-1 逆向（左→右） */
  direction: 1 | -1;
  /** 静态弹幕所在轨道，用于 resize 后重新贴边 */
  lane: number;
}

/** 某条滚动轨道上一条弹幕的占位信息 */
interface ScrollSlot {
  spawnTime: number;
  width: number;
  speed: number;
}

/** 1-3 正向滚动，6 逆向滚动 */
function isScrollMode(mode: number): boolean {
  return mode === 1 || mode === 2 || mode === 3 || mode === 6;
}

function laneCount(height: number): number {
  return Math.max(1, Math.floor(height / LANE_HEIGHT));
}

interface DanmakuLayerProps {
  items: DanmakuItem[];
  video: HTMLVideoElement | null;
  enabled: boolean;
  /** 0~1，弹幕整体透明度 */
  opacity?: number;
}

/**
 * 弹幕层。位置计算放在 rAF 里直接改 DOM：
 * 每秒 60 次 setState 会把 React 拖死，所以不走 state。
 */
export function DanmakuLayer({
  items,
  video,
  enabled,
  opacity = 1,
}: DanmakuLayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !video || !enabled || items.length === 0) return;

    const active: ActiveItem[] = [];
    /** 滚动弹幕轨道，记录上一条的位置信息用于防追尾 */
    let scrollSlots: (ScrollSlot | null)[] = [];
    /** 顶部/底部弹幕轨道下一次可用时间 */
    let topFree: number[] = [];
    let bottomFree: number[] = [];
    let cursor = 0;
    let lastTime = Number.NaN;
    let frame = 0;

    const seek = (time: number) => {
      for (const entry of active) entry.node.remove();
      active.length = 0;
      scrollSlots = [];
      topFree = [];
      bottomFree = [];

      let low = 0;
      let high = items.length;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (items[mid].time < time) low = mid + 1;
        else high = mid;
      }
      cursor = low;
    };

    /** 找一条能容纳新弹幕的滚动轨道；返回 -1 表示暂时没有 */
    const findScrollLane = (time: number, speed: number) => {
      const maxLanes = laneCount(container.clientHeight);
      for (let lane = 0; lane < scrollSlots.length; lane += 1) {
        const slot = scrollSlots[lane];
        if (!slot) return lane;

        const elapsed = time - slot.spawnTime;
        if (elapsed >= SCROLL_DURATION) return lane;

        // 上一条尾部是否已完全进入屏幕
        const gap = elapsed * slot.speed - slot.width;
        if (gap < 0) continue;

        // 新弹幕更快时才可能追尾，留够余量否则换下一轨
        const diff = speed - slot.speed;
        if (diff > 0 && gap < diff * (SCROLL_DURATION - elapsed)) continue;

        return lane;
      }
      if (scrollSlots.length < maxLanes) {
        scrollSlots.push(null);
        return scrollSlots.length - 1;
      }
      return -1;
    };

    const findStaticLane = (free: number[], lanes: number, time: number) => {
      for (let lane = 0; lane < lanes; lane += 1) {
        if ((free[lane] ?? 0) <= time) return lane;
      }
      return -1;
    };

    const staticTop = (
      item: DanmakuItem,
      lane: number,
      height: number,
    ): number =>
      item.mode === 5
        ? lane * LANE_HEIGHT + 2
        : height - (lane + 1) * LANE_HEIGHT + 2;

    const spawn = (item: DanmakuItem, time: number) => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height || active.length >= MAX_ACTIVE) return;

      const node = document.createElement("div");
      node.className = "danmaku";
      node.textContent = item.text;
      node.style.color = item.color;
      node.style.fontSize = `${item.size}px`;
      container.appendChild(node);
      const textWidth = node.offsetWidth;

      // 高级弹幕：按归一化坐标定位，按自身时长消失，不占轨道
      if (item.mode === 7 && item.advanced) {
        const advanced = item.advanced;
        node.style.left = `${advanced.x * width}px`;
        node.style.top = `${advanced.y * height}px`;
        node.style.transform = `translate(-50%, -50%) rotate(${advanced.rotate}deg)`;
        node.style.opacity = String(advanced.alpha);
        active.push({
          node,
          item,
          width: textWidth,
          speed: 0,
          direction: 1,
          lane: 0,
        });
        return;
      }

      const lanes = laneCount(height);
      const speed = (width + textWidth) / SCROLL_DURATION;

      if (isScrollMode(item.mode)) {
        const lane = findScrollLane(time, speed);
        if (lane < 0) {
          node.remove();
          return;
        }
        const direction: 1 | -1 = item.mode === 6 ? -1 : 1;
        node.style.top = `${lane * LANE_HEIGHT + 2}px`;
        node.style.left = "0";
        const start = direction === 1 ? width : -textWidth;
        node.style.transform = `translateX(${start}px)`;
        scrollSlots[lane] = { spawnTime: time, width: textWidth, speed };
        active.push({ node, item, width: textWidth, speed, direction, lane });
        return;
      }

      // 顶部/底部静态弹幕
      const free = item.mode === 5 ? topFree : bottomFree;
      const lane = findStaticLane(free, lanes, time);
      if (lane < 0) {
        node.remove();
        return;
      }
      free[lane] = time + STATIC_DURATION;
      node.style.left = "50%";
      node.style.transform = "translateX(-50%)";
      node.style.top = `${staticTop(item, lane, height)}px`;
      active.push({
        node,
        item,
        width: textWidth,
        speed: 0,
        direction: 1,
        lane,
      });
    };

    const tick = () => {
      frame = window.requestAnimationFrame(tick);
      const time = video.currentTime;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!Number.isFinite(time)) return;
      // 拖动进度条或回到开头：重建活跃集合
      if (Number.isNaN(lastTime) || Math.abs(time - lastTime) > 1.5) {
        seek(Math.max(0, time - 0.1));
      }
      lastTime = time;

      // 暂停时只保留画面，不推进位置
      if (video.paused) return;

      while (cursor < items.length && items[cursor].time <= time) {
        spawn(items[cursor], items[cursor].time);
        cursor += 1;
      }

      for (let index = active.length - 1; index >= 0; index -= 1) {
        const entry = active[index];
        const elapsed = time - entry.item.time;
        const mode = entry.item.mode;
        const total =
          mode === 7 && entry.item.advanced
            ? entry.item.advanced.duration
            : isScrollMode(mode)
              ? SCROLL_DURATION
              : STATIC_DURATION;

        if (elapsed >= total) {
          entry.node.remove();
          active.splice(index, 1);
          continue;
        }

        if (isScrollMode(mode)) {
          const x =
            entry.direction === 1
              ? width - elapsed * entry.speed
              : -entry.width + elapsed * entry.speed;
          entry.node.style.transform = `translateX(${x}px)`;
        } else if (mode === 4 || mode === 5) {
          entry.node.style.top = `${staticTop(entry.item, entry.lane, height)}px`;
        }
      }
    };

    seek(Math.max(0, video.currentTime));
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      for (const entry of active) entry.node.remove();
      active.length = 0;
    };
  }, [items, video, enabled]);

  return (
    <div
      ref={containerRef}
      className="danmakuLayer"
      style={{ opacity: enabled ? opacity : 0 }}
      aria-hidden="true"
    />
  );
}
