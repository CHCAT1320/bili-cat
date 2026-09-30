import { coverUrl } from "./feed";

export interface TimelineEpisode {
  episode_id: number;
  season_id: number;
  title: string;
  cover: string;
  pub_index?: string;
  pub_time?: string;
  published?: boolean;
  delay?: number;
  delay_reason?: string;
}

export interface TimelineDay {
  date: string;
  day_of_week: number;
  is_today?: number;
  episodes?: TimelineEpisode[];
}

export interface BangumiEpisode {
  id: number;
  aid: number;
  cid: number;
  title: string;
  long_title?: string;
  cover: string;
  badge?: string;
}

export interface BangumiSeason {
  seasonId: number;
  title: string;
  jpTitle?: string;
  cover: string;
  evaluate: string;
  total?: number;
  areas: string[];
  styles: string[];
  newEp?: string;
  views?: number;
  episodes: BangumiEpisode[];
  extras: Array<{ title: string; episodes: BangumiEpisode[] }>;
}

interface RawEpisode {
  id: number;
  aid: number;
  cid: number;
  title?: string;
  long_title?: string;
  cover?: string;
  badge?: string;
}

interface RawSection {
  title?: string;
  episodes?: RawEpisode[];
}

export interface RawSeason {
  season_id: number;
  title: string;
  jp_title?: string;
  cover?: string;
  evaluate?: string;
  total?: number;
  areas?: Array<{ name?: string }>;
  styles?: string[];
  new_ep?: { index_show?: string };
  stat?: { views?: number };
}

function toEpisode(raw: RawEpisode): BangumiEpisode {
  return {
    id: raw.id,
    aid: raw.aid,
    cid: raw.cid,
    title: raw.title ?? "",
    long_title: raw.long_title,
    cover: coverUrl(raw.cover ?? ""),
    badge: raw.badge,
  };
}

export function toSeason(
  info: RawSeason,
  main?: RawSection,
  extras?: RawSection[],
): BangumiSeason {
  return {
    seasonId: info.season_id,
    title: info.title,
    jpTitle: info.jp_title,
    cover: coverUrl(info.cover ?? ""),
    evaluate: info.evaluate ?? "",
    total: typeof info.total === "number" ? info.total : undefined,
    areas: (info.areas ?? [])
      .map((area) => area.name ?? "")
      .filter(Boolean),
    styles: info.styles ?? [],
    newEp: info.new_ep?.index_show,
    views: info.stat?.views,
    episodes: (main?.episodes ?? []).map(toEpisode),
    extras: (extras ?? [])
      .filter((section) => (section.episodes ?? []).length > 0)
      .map((section) => ({
        title: section.title ?? "",
        episodes: (section.episodes ?? []).map(toEpisode),
      })),
  };
}

/** 时间表里 week 1~7 对应周一到周日 */
export const WEEKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export function weekdayKey(dayOfWeek: number): (typeof WEEKDAY_KEYS)[number] {
  const index = Math.min(Math.max(dayOfWeek, 1), 7) - 1;
  return WEEKDAY_KEYS[index];
}

/** 只有纯数字标题才是正片集数，PV/花絮这类直接用原标题 */
export function episodeLabel(episode: BangumiEpisode): string {
  const index = /^\d+$/.test(episode.title) ? `第${episode.title}话` : episode.title;
  return [index, episode.long_title].filter(Boolean).join(" ").trim();
}

export function episodeName(episode: BangumiEpisode): string {
  if (episode.long_title) return episode.long_title;
  return /^\d+$/.test(episode.title) ? `第${episode.title}话` : episode.title;
}
