export interface AdvancedDanmaku {
  /** 0~1，相对屏幕宽度 */
  x: number;
  /** 0~1，相对屏幕高度 */
  y: number;
  /** 0~1 透明度 */
  alpha: number;
  /** 停留秒数 */
  duration: number;
  /** 旋转角度（度） */
  rotate: number;
}

export interface DanmakuItem {
  /** 出现时间（秒） */
  time: number;
  /** 1-3 滚动，4 底部，5 顶部，6 逆向滚动，7 高级弹幕 */
  mode: number;
  size: number;
  color: string;
  text: string;
  /** mode 7 的定位/透明度参数 */
  advanced?: AdvancedDanmaku;
}

/** `<d p="时间,模式,字号,颜色,时间戳,池,uid,rowid,...">文本</d>` */
const DANMAKU_PATTERN = /<d p="([^"]*)"[^>]*>([\s\S]*?)<\/d>/g;

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function toNumber(value: unknown, fallback: number): number {
  const num = typeof value === "string" ? Number(value.replace(/s$/, "")) : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * 高级弹幕（mode 7）的正文是一段 JSON 数组，形如
 * `["0.5","0.5",1,"0.5s",4.5,"文本",0,0,0,0,"",0]`。
 * 不同时期字段含义略有出入，这里只取最稳定的一组：
 * x、y（0~1 归一化）、alpha、持续时间、文本、旋转角度。
 */
interface ParsedAdvanced {
  body: string;
  advanced: AdvancedDanmaku;
}

function parseAdvanced(text: string): ParsedAdvanced | null {
  if (!text.startsWith("[")) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length < 6) return null;
  const body = String(raw[5] ?? "");
  if (!body) return null;
  return {
    body,
    advanced: {
      x: Math.min(Math.max(toNumber(raw[0], 0.5), 0), 1),
      y: Math.min(Math.max(toNumber(raw[1], 0.5), 0), 1),
      alpha: Math.min(Math.max(toNumber(raw[2], 1), 0), 1),
      duration: Math.max(toNumber(raw[3], 5), 1),
      rotate: toNumber(raw[6], 0),
    },
  };
}

export function parseDanmaku(xml: string): DanmakuItem[] {
  const items: DanmakuItem[] = [];

  for (const match of xml.matchAll(DANMAKU_PATTERN)) {
    const parts = match[1].split(",");
    const time = Number(parts[0]);
    const mode = Number(parts[1]);
    const size = Number(parts[2]) || 25;
    const color = Number(parts[3]);

    if (!Number.isFinite(time)) continue;
    // 代码弹幕(7/8 之外的 8)与 BAS(9) 不渲染；高级弹幕(7)单独解析
    if (![1, 2, 3, 4, 5, 6, 7].includes(mode)) continue;

    const text = decodeEntities(match[2]).trim();
    if (!text) continue;

    const item: DanmakuItem = {
      time,
      mode,
      size: Math.min(Math.max(size, 14), 30),
      color: `#${(Number.isFinite(color) ? color & 0xffffff : 0xffffff)
        .toString(16)
        .padStart(6, "0")}`,
      text,
    };

    if (mode === 7) {
      const parsed = parseAdvanced(text);
      if (!parsed) continue;
      item.advanced = parsed.advanced;
      item.text = parsed.body;
    }

    items.push(item);
  }

  return items.sort((a, b) => a.time - b.time);
}

/**
 * 走 Rust 取弹幕：`x/v1/dm/list.so` 返回的是裸 deflate 压缩的 XML，
 * WebView 直接 fetch 会拿到乱码；registry 里的 seg.so 是 protobuf，
 * 解析成本高，所以这里用 XML 这个更省事的老接口。
 */
export async function fetchDanmaku(cid: number): Promise<DanmakuItem[]> {
  // 动态导入：让 parseDanmaku 能脱离 Tauri 环境单独测试
  const { invoke } = await import("@tauri-apps/api/core");
  const url = `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`;
  const xml = await invoke<string>("fetch_text", { url });
  return parseDanmaku(xml);
}
