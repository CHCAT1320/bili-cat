import { coverUrl, type VideoCardData } from "./feed";
import type { UserCardData } from "./users";
import { formatDuration } from "../utils/format";

export interface FavoriteFolder {
  id: number;
  title: string;
  mediaCount: number;
  cover: string;
}

export interface FavoriteFolderRaw {
  id: number;
  title: string;
  media_count?: number;
  cover?: string;
}

export interface FavoriteFolderList {
  list?: FavoriteFolderRaw[];
}

export function toFolder(raw: FavoriteFolderRaw): FavoriteFolder {
  return {
    id: raw.id,
    title: raw.title,
    mediaCount: raw.media_count ?? 0,
    cover: coverUrl(raw.cover ?? ""),
  };
}

/**
 * 收藏 / 历史 / 稍后再看 三种接口的字段各不相同，这里做兼容映射：
 * - 收藏: { bvid, title, cover, upper{name,face}, cnt_info{play}, duration }
 * - 历史: { title, cover, author_name, duration, history{ bvid, duration } }
 * - 稍后再看: { bvid, title, pic, owner{name,face}, stat{view}, duration }
 */
export function toVideoCard(raw: Record<string, unknown>): VideoCardData | null {
  const history = (raw.history ?? {}) as Record<string, unknown>;
  const owner = (raw.owner ?? raw.upper ?? {}) as Record<string, unknown>;
  const stat = raw.stat as Record<string, unknown> | undefined;
  const countInfo = raw.cnt_info as Record<string, unknown> | undefined;

  const bvid = String(raw.bvid ?? history.bvid ?? "");
  if (!bvid) return null;

  const duration = Number(raw.duration ?? history.duration ?? 0);
  const view = Number(stat?.view ?? countInfo?.play ?? raw.play ?? 0);

  return {
    bvid,
    title: String(raw.title ?? ""),
    pic: coverUrl(String(raw.pic ?? raw.cover ?? "")),
    duration: duration > 0 ? formatDuration(duration) : undefined,
    upName: String(owner.name ?? raw.author_name ?? "") || undefined,
    upFace: coverUrl(String(owner.face ?? raw.author_face ?? "")) || undefined,
    view: view > 0 ? view : undefined,
  };
}

export function toFollowCard(raw: Record<string, unknown>): UserCardData {
  const verify = raw.official_verify as { type?: number; desc?: string } | undefined;
  return {
    mid: Number(raw.mid ?? 0),
    name: String(raw.uname ?? ""),
    face: coverUrl(String(raw.face ?? "")),
    sign: String(raw.sign ?? "").trim() || undefined,
    verify:
      verify && typeof verify.type === "number" && verify.desc
        ? verify.desc
        : undefined,
  };
}
