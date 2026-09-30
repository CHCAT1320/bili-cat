import { coverUrl } from "./feed";

export interface SearchUser {
  mid: number;
  uname: string;
  upic: string;
  usign?: string;
  fans?: number;
  videos?: number;
  level?: number;
  official_verify?: { type?: number; desc?: string };
}

export interface UserSearchResult {
  result?: SearchUser[];
  numPages?: number;
  numResults?: number;
}

export interface UserCardData {
  mid: number;
  name: string;
  face: string;
  sign?: string;
  fans?: number;
  videos?: number;
  level?: number;
  verify?: string;
}

export function userToCard(user: SearchUser): UserCardData {
  const verify = user.official_verify;
  return {
    mid: user.mid,
    name: user.uname,
    face: coverUrl(user.upic ?? ""),
    sign: user.usign?.trim() || undefined,
    fans: user.fans,
    videos: user.videos,
    level: user.level,
    verify:
      verify && typeof verify.type === "number" && verify.desc
        ? verify.desc
        : undefined,
  };
}

export interface UserProfile {
  mid: number;
  name: string;
  face: string;
  sign?: string;
  level?: number;
  fans?: number;
  following?: number;
}

export interface SpaceVideo {
  bvid: string;
  title: string;
  pic: string;
  duration?: string;
  play?: number;
  created?: number;
}

export interface SpaceVideoList {
  count?: number;
  vlist?: SpaceVideo[];
}
