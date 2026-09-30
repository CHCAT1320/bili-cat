export interface VideoId {
  bvid?: string;
  aid?: number;
}

const BV_PATTERN = /BV[0-9A-Za-z]{10}/;
const AV_PATTERN = /av(\d+)/i;

/**
 * 从用户输入里解析视频标识，支持 BV 号、av 号、纯数字 aid，
 * 以及直接粘贴的视频链接（https://www.bilibili.com/video/BV...）。
 */
export function parseVideoId(input: string): VideoId | null {
  const text = input.trim();
  if (!text) return null;

  const bv = BV_PATTERN.exec(text);
  if (bv) return { bvid: bv[0] };

  const av = AV_PATTERN.exec(text);
  if (av) return { aid: Number(av[1]) };

  if (/^\d{6,19}$/.test(text)) return { aid: Number(text) };

  return null;
}

export function videoIdKey(id: VideoId | null): string {
  if (!id) return "";
  return id.bvid ?? (id.aid ? `av${id.aid}` : "");
}
