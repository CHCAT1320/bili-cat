import { formatDuration } from "../utils/format";

export interface FeedVideo {
  bvid: string;
  title: string;
  pic: string;
  goto?: string;
  uri?: string;
  duration?: number;
  owner?: { mid?: number; name?: string; face?: string };
  stat?: { view?: number };
}

export interface Feed {
  item?: FeedVideo[];
}

export interface SearchVideo {
  bvid: string;
  title: string;
  pic: string;
  duration?: string;
  author?: string;
  mid?: number;
  upic?: string;
  play?: number;
  pubdate?: number;
  description?: string;
}

export interface SearchResult {
  result?: SearchVideo[];
  numPages?: number;
  numResults?: number;
}

/** 卡片只消费这个视图模型，推荐流与搜索结果都转成它 */
export interface VideoCardData {
  bvid: string;
  title: string;
  pic: string;
  duration?: string;
  upName?: string;
  upFace?: string;
  view?: number;
  /** 搜索结果的命中词分段，用于高亮；推荐流不带 */
  titleParts?: TitlePart[];
}

export interface TitlePart {
  text: string;
  highlight: boolean;
}

export function isVideoItem(item: FeedVideo): boolean {
  return item.goto === "av";
}

export function coverUrl(pic: string): string {
  if (!pic) return "";
  if (pic.startsWith("//")) return `https:${pic}`;
  return pic.replace(/^http:\/\//, "https://");
}

/** 搜索结果标题里带 <em class="keyword"> 高亮标签 */
export function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

const HIGHLIGHT = /<em class="keyword">(.*?)<\/em>/g;

/** 把搜索结果标题切成普通段与命中段，避免直接用 innerHTML */
export function toTitleParts(html: string): TitlePart[] {
  const parts: TitlePart[] = [];
  let cursor = 0;

  for (const match of html.matchAll(HIGHLIGHT)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      parts.push({ text: stripTags(html.slice(cursor, index)), highlight: false });
    }
    parts.push({ text: stripTags(match[1]), highlight: true });
    cursor = index + match[0].length;
  }

  if (cursor < html.length) {
    parts.push({ text: stripTags(html.slice(cursor)), highlight: false });
  }

  return parts.filter((part) => part.text.length > 0);
}

export function feedToCard(video: FeedVideo): VideoCardData {
  return {
    bvid: video.bvid,
    title: video.title,
    pic: coverUrl(video.pic),
    duration: formatDuration(video.duration),
    upName: video.owner?.name,
    upFace: coverUrl(video.owner?.face ?? ""),
    view: video.stat?.view,
  };
}

export function searchToCard(video: SearchVideo): VideoCardData {
  const duration = video.duration ?? "";
  const rawTitle = video.title ?? "";
  return {
    bvid: video.bvid,
    title: stripTags(rawTitle),
    titleParts: toTitleParts(rawTitle),
    pic: coverUrl(video.pic ?? ""),
    duration: /^\d+:\d+$/.test(duration) ? duration : "",
    upName: video.author,
    upFace: coverUrl(video.upic ?? ""),
    view: video.play,
  };
}
