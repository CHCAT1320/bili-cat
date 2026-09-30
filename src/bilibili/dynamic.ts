import { coverUrl } from "./feed";

/** 协议相对 / http 地址统一升到 https */
export function httpsUrl(value?: string | null): string {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return value.replace(/^http:\/\//, "https://");
}

export interface RichTextNode {
  type: string;
  text: string;
  jumpUrl?: string;
  rid?: string;
  emojiUrl?: string;
  emojiSize?: number;
}

export interface RichText {
  text: string;
  nodes: RichTextNode[];
}

const PLACEHOLDER =
  /^(网页链接|视频链接|专栏链接|直播链接|动态链接|投票|商品|小程序|相关游戏|番剧|影视|课程|活动|比赛|链接)$/;

const LINK_NODE_TYPES = new Set([
  "RICH_TEXT_NODE_TYPE_WEB",
  "RICH_TEXT_NODE_TYPE_LOTTERY",
  "RICH_TEXT_NODE_TYPE_OGV",
  "RICH_TEXT_NODE_TYPE_AV",
  "RICH_TEXT_NODE_TYPE_CV",
  "RICH_TEXT_NODE_TYPE_BV",
  "RICH_TEXT_NODE_TYPE_VOTE",
  "RICH_TEXT_NODE_TYPE_GOODS",
  "RICH_TEXT_NODE_TYPE_MAIL",
]);

interface RawNode {
  type?: string;
  text?: string;
  orig_text?: string;
  jump_url?: string;
  rid?: string | number;
  icon_url?: string;
  emoji?: {
    icon_url?: string;
    url?: string;
    icon?: { url?: string };
    size?: number;
  };
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || /^www\./i.test(value);
}

function resolveNodeText(raw: RawNode): string {
  const text = raw.text ?? raw.orig_text ?? "";
  if (isUrl(text)) return text;
  if (raw.orig_text && isUrl(raw.orig_text)) return raw.orig_text;
  if (LINK_NODE_TYPES.has(raw.type ?? "") && (!text || PLACEHOLDER.test(text))) {
    return raw.jump_url ?? text;
  }
  return text;
}

function toNode(raw: RawNode): RichTextNode {
  const emoji = raw.emoji;
  return {
    type: raw.type ?? "",
    text: resolveNodeText(raw),
    jumpUrl: raw.jump_url ? httpsUrl(raw.jump_url) : undefined,
    rid: raw.rid !== undefined ? String(raw.rid) : undefined,
    emojiUrl: emoji
      ? httpsUrl(emoji.icon_url ?? emoji.icon?.url ?? emoji.url ?? raw.icon_url)
      : undefined,
    emojiSize: emoji?.size,
  };
}

export function toRichText(raw: { text?: string; rich_text_nodes?: RawNode[] } | null | undefined): RichText | undefined {
  if (!raw) return undefined;
  const nodes = (raw.rich_text_nodes ?? []).map(toNode).filter((node) => node.text || node.emojiUrl);
  if (nodes.length === 0 && !raw.text) return undefined;
  return { text: raw.text ?? "", nodes };
}

function richTextFromDesc(
  raw: { text?: string; rich_text_nodes?: RawNode[] } | null | undefined,
): RichText | undefined {
  return toRichText(raw);
}

export interface DynamicImage {
  url: string;
  width?: number;
  height?: number;
}

export type DynamicCard =
  | {
      kind: "video";
      title: string;
      cover: string;
      duration?: string;
      desc?: string;
      stat?: string;
      badge?: string;
      bvid?: string;
      jumpUrl?: string;
    }
  | { kind: "images"; images: DynamicImage[]; title?: string }
  | {
      kind: "article";
      title: string;
      covers: string[];
      desc?: string;
      label?: string;
      jumpUrl?: string;
    }
  | {
      kind: "live";
      title: string;
      cover: string;
      desc1?: string;
      desc2?: string;
      liveState?: number;
      jumpUrl?: string;
    }
  | { kind: "music"; title: string; cover: string; label?: string; jumpUrl?: string }
  | {
      kind: "common";
      title: string;
      cover?: string;
      desc?: string;
      label?: string;
      badge?: string;
      jumpUrl?: string;
    }
  | { kind: "none"; tips?: string };

export type DynamicAdditional =
  | {
      kind: "ugc";
      title: string;
      cover: string;
      duration?: string;
      desc?: string;
      jumpUrl?: string;
    }
  | {
      kind: "common";
      headText?: string;
      title: string;
      desc1?: string;
      desc2?: string;
      cover?: string;
      jumpUrl?: string;
    }
  | {
      kind: "vote";
      title: string;
      desc?: string;
      options: Array<{ desc: string; cnt?: number }>;
      joinNum?: number;
    }
  | {
      kind: "reserve";
      title: string;
      desc1?: string;
      desc2?: string;
      desc3?: string;
      jumpUrl?: string;
    }
  | {
      kind: "goods";
      headText?: string;
      items: Array<{ name: string; price?: string; cover?: string; jumpUrl?: string }>;
    };

export interface DynamicAuthor {
  mid: number;
  name: string;
  face: string;
  label?: string;
  officialDesc?: string;
  location?: string;
  following?: boolean;
}

export interface DynamicItem {
  id: string;
  type: string;
  author: DynamicAuthor;
  pubTime: number;
  pubTimeText?: string;
  text?: RichText;
  card?: DynamicCard;
  additional?: DynamicAdditional;
  forward?: DynamicItem;
  like: number;
  comment: number;
  forwardCount: number;
  interaction: string[];
  tag?: string;
  dispute?: { title: string; desc?: string };
  foldStatement?: string;
  visible: boolean;
  inAudit: boolean;
  onlyFans: boolean;
  aigc: boolean;
}

interface RawMajor {
  type?: string;
  archive?: {
    bvid?: string;
    title?: string;
    cover?: string;
    desc?: string;
    duration_text?: string;
    jump_url?: string;
    badge?: { text?: string };
    stat?: { play?: number | string; danmaku?: number | string };
  };
  opus?: {
    title?: string;
    summary?: { text?: string; rich_text_nodes?: RawNode[] };
    pics?: Array<{ url?: string; width?: number; height?: number }>;
    jump_url?: string;
  };
  draw?: {
    items?: Array<{ src?: string; width?: number; height?: number }>;
  };
  article?: {
    id?: number;
    title?: string;
    covers?: string[];
    desc?: string;
    label?: string;
    jump_url?: string;
  };
  ugc_season?: {
    title?: string;
    cover?: string;
    desc?: string;
    duration_text?: string;
    jump_url?: string;
    stat?: { play?: number | string };
  };
  pgc?: {
    title?: string;
    cover?: string;
    jump_url?: string;
    badge?: { text?: string };
    stat?: { play?: number | string };
  };
  live?: {
    title?: string;
    cover?: string;
    desc_first?: string;
    desc_second?: string;
    live_state?: number;
    jump_url?: string;
  };
  live_rcmd?: { content?: string };
  music?: { title?: string; cover?: string; label?: string; jump_url?: string };
  common?: {
    title?: string;
    cover?: string;
    desc?: string;
    label?: string;
    badge?: { text?: string };
    jump_url?: string;
  };
  courses?: {
    title?: string;
    cover?: string;
    sub_title?: string;
    desc?: string;
    jump_url?: string;
  };
  medialist?: { title?: string; cover?: string; desc?: string; jump_url?: string };
  none?: { tips?: string };
}

interface RawAdditional {
  type?: string;
  ugc?: {
    title?: string;
    cover?: string;
    duration?: string;
    desc_second?: string;
    jump_url?: string;
  };
  common?: {
    head_text?: string;
    title?: string;
    desc1?: string;
    desc2?: string;
    cover?: string;
    jump_url?: string;
  };
  vote?: {
    title?: string;
    desc?: string;
    join_num?: number;
    options?: Array<{ desc?: string; cnt?: number }>;
  };
  reserve?: {
    title?: string;
    desc1?: string;
    desc2?: string;
    desc3?: string;
    jump_url?: string;
  };
  goods?: {
    head_text?: string;
    items?: Array<{
      name?: string;
      price?: string;
      cover?: string;
      jump_url?: string;
    }>;
  };
}

interface RawDynamic {
  id_str?: string;
  type?: string;
  visible?: boolean;
  basic?: {
    aigc?: boolean;
    in_audit?: boolean;
    is_only_fans?: boolean;
  };
  modules?: {
    module_author?: {
      mid?: number;
      name?: string;
      face?: string;
      pub_ts?: number | string;
      pub_time?: string;
      label?: string;
      following?: boolean;
      pub_action?: string;
      official_verify?: { type?: number; desc?: string };
    };
    module_dynamic?: {
      desc?: { text?: string; rich_text_nodes?: RawNode[] } | null;
      major?: RawMajor | null;
      additional?: RawAdditional | null;
    };
    module_stat?: {
      like?: { count?: number | string };
      comment?: { count?: number | string };
      forward?: { count?: number | string };
    };
    module_interaction?: {
      items?: Array<{ desc?: { text?: string; rich_text_nodes?: RawNode[] } }>;
    };
    module_tag?: { text?: string };
    module_dispute?: { title?: string; desc?: string };
    module_fold?: { statement?: string };
  };
  orig?: RawDynamic | null;
}

const toCount = (value: number | string | undefined): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = Number(value.replace(/[^\d.]/g, ""));
    if (!Number.isFinite(num)) return 0;
    return value.includes("万") ? Math.round(num * 10000) : Math.round(num);
  }
  return 0;
};

const statText = (stat?: { play?: number | string; danmaku?: number | string }): string => {
  if (!stat) return "";
  const parts: string[] = [];
  if (stat.play !== undefined) parts.push(`${stat.play}播放`);
  if (stat.danmaku !== undefined) parts.push(`${stat.danmaku}弹幕`);
  return parts.join(" · ");
};

function toCard(major: RawMajor | null | undefined): DynamicCard | undefined {
  if (!major) return undefined;
  const type = major.type ?? "";
  const kindFromType = type.replace("MAJOR_TYPE_", "").toLowerCase();

  const pick = <T extends keyof RawMajor>(key: T): RawMajor[T] | undefined =>
    major[key];

  const draw = pick("draw");
  const opus = pick("opus");
  const archive = pick("archive");

  if (archive || kindFromType === "archive") {
    const a = archive;
    if (a?.bvid || a?.title) {
      return {
        kind: "video",
        title: a?.title ?? "",
        cover: httpsUrl(a?.cover),
        duration: a?.duration_text,
        desc: a?.desc && a.desc !== "-" ? a.desc : undefined,
        stat: statText(a?.stat),
        badge: a?.badge?.text,
        bvid: a?.bvid,
        jumpUrl: httpsUrl(a?.jump_url),
      };
    }
  }

  if (opus || kindFromType === "opus") {
    const images = (opus?.pics ?? [])
      .map((pic) => ({
        url: httpsUrl(pic.url),
        width: pic.width,
        height: pic.height,
      }))
      .filter((pic) => pic.url);
    if (images.length > 0) return { kind: "images", images, title: opus?.title };
  }

  if (draw || kindFromType === "draw") {
    const images = (draw?.items ?? [])
      .map((item) => ({
        url: httpsUrl(item.src),
        width: item.width,
        height: item.height,
      }))
      .filter((pic) => pic.url);
    if (images.length > 0) return { kind: "images", images };
  }

  const article = pick("article");
  if (article || kindFromType === "article") {
    if (article?.title) {
      return {
        kind: "article",
        title: article.title,
        covers: (article.covers ?? []).map(httpsUrl).filter(Boolean),
        desc: article.desc,
        label: article.label,
        jumpUrl: httpsUrl(article.jump_url),
      };
    }
  }

  const season = pick("ugc_season");
  if (season && (season.title || season.cover)) {
    return {
      kind: "video",
      title: season.title ?? "",
      cover: httpsUrl(season.cover),
      duration: season.duration_text,
      desc: season.desc,
      stat: statText(season.stat),
      badge: "合集",
      jumpUrl: httpsUrl(season.jump_url),
    };
  }

  const pgc = pick("pgc");
  if (pgc && (pgc.title || pgc.cover)) {
    return {
      kind: "video",
      title: pgc.title ?? "",
      cover: httpsUrl(pgc.cover),
      stat: statText(pgc.stat),
      badge: pgc.badge?.text ?? "番剧",
      jumpUrl: httpsUrl(pgc.jump_url),
    };
  }

  const live = pick("live");
  if (live && (live.title || live.cover)) {
    return {
      kind: "live",
      title: live.title ?? "",
      cover: httpsUrl(live.cover),
      desc1: live.desc_first,
      desc2: live.desc_second,
      liveState: live.live_state,
      jumpUrl: httpsUrl(live.jump_url),
    };
  }

  const music = pick("music");
  if (music && (music.title || music.cover)) {
    return {
      kind: "music",
      title: music.title ?? "",
      cover: httpsUrl(music.cover),
      label: music.label,
      jumpUrl: httpsUrl(music.jump_url),
    };
  }

  const courses = pick("courses");
  if (courses && (courses.title || courses.cover)) {
    return {
      kind: "common",
      title: courses.title ?? "",
      cover: httpsUrl(courses.cover),
      desc: courses.sub_title ?? courses.desc,
      label: "课程",
      jumpUrl: httpsUrl(courses.jump_url),
    };
  }

  const medialist = pick("medialist");
  if (medialist && (medialist.title || medialist.cover)) {
    return {
      kind: "common",
      title: medialist.title ?? "",
      cover: httpsUrl(medialist.cover),
      desc: medialist.desc,
      label: "播单",
      jumpUrl: httpsUrl(medialist.jump_url),
    };
  }

  const common = pick("common");
  if (common && (common.title || common.cover)) {
    return {
      kind: "common",
      title: common.title ?? "",
      cover: httpsUrl(common.cover),
      desc: common.desc,
      label: common.label,
      badge: common.badge?.text,
      jumpUrl: httpsUrl(common.jump_url),
    };
  }

  const none = pick("none");
  if (none?.tips) return { kind: "none", tips: none.tips };

  return undefined;
}

function toAdditional(
  additional: RawAdditional | null | undefined,
): DynamicAdditional | undefined {
  if (!additional) return undefined;
  const ugc = additional.ugc;
  if (ugc) {
    return {
      kind: "ugc",
      title: ugc.title ?? "",
      cover: httpsUrl(ugc.cover),
      duration: ugc.duration,
      desc: ugc.desc_second,
      jumpUrl: httpsUrl(ugc.jump_url),
    };
  }
  if (additional.vote) {
    return {
      kind: "vote",
      title: additional.vote.title ?? "",
      desc: additional.vote.desc,
      joinNum: additional.vote.join_num,
      options: (additional.vote.options ?? []).map((option) => ({
        desc: option.desc ?? "",
        cnt: option.cnt,
      })),
    };
  }
  if (additional.reserve) {
    return {
      kind: "reserve",
      title: additional.reserve.title ?? "",
      desc1: additional.reserve.desc1,
      desc2: additional.reserve.desc2,
      desc3: additional.reserve.desc3,
      jumpUrl: httpsUrl(additional.reserve.jump_url),
    };
  }
  if (additional.goods) {
    return {
      kind: "goods",
      headText: additional.goods.head_text,
      items: (additional.goods.items ?? []).map((item) => ({
        name: item.name ?? "",
        price: item.price,
        cover: httpsUrl(item.cover),
        jumpUrl: httpsUrl(item.jump_url),
      })),
    };
  }
  if (additional.common) {
    return {
      kind: "common",
      headText: additional.common.head_text,
      title: additional.common.title ?? "",
      desc1: additional.common.desc1,
      desc2: additional.common.desc2,
      cover: httpsUrl(additional.common.cover),
      jumpUrl: httpsUrl(additional.common.jump_url),
    };
  }
  return undefined;
}

export function toDynamic(raw: RawDynamic | null | undefined): DynamicItem | null {
  if (!raw) return null;
  const id = raw.id_str ?? "";
  if (!id) return null;
  const author = raw.modules?.module_author ?? {};
  const dynamic = raw.modules?.module_dynamic ?? {};
  const stat = raw.modules?.module_stat ?? {};
  const major = dynamic.major ?? null;

  const text =
    richTextFromDesc(dynamic.desc) ??
    (major?.opus?.summary ? toRichText(major.opus.summary) : undefined);

  const interaction = (raw.modules?.module_interaction?.items ?? [])
    .map((item) => item.desc?.text ?? "")
    .filter(Boolean);

  const forward = raw.orig ? toDynamic(raw.orig) ?? undefined : undefined;
  const official = author.official_verify;

  return {
    id,
    type: raw.type ?? "",
    author: {
      mid: author.mid ?? 0,
      name: author.name ?? "",
      face: coverUrl(author.face ?? ""),
      label: author.label,
      officialDesc: official?.desc,
      location: (author as { pub_location_text?: string }).pub_location_text,
      following: author.following,
    },
    pubTime: Number(author.pub_ts ?? 0) || 0,
    pubTimeText: author.pub_time,
    text,
    card: toCard(major),
    additional: toAdditional(dynamic.additional),
    forward,
    like: toCount(stat.like?.count),
    comment: toCount(stat.comment?.count),
    forwardCount: toCount(stat.forward?.count),
    interaction,
    tag: raw.modules?.module_tag?.text,
    dispute: raw.modules?.module_dispute
      ? {
          title: raw.modules.module_dispute.title ?? "",
          desc: raw.modules.module_dispute.desc,
        }
      : undefined,
    foldStatement: raw.modules?.module_fold?.statement,
    visible: raw.visible !== false,
    inAudit: Boolean(raw.basic?.in_audit),
    onlyFans: Boolean(raw.basic?.is_only_fans),
    aigc: Boolean(raw.basic?.aigc),
  };
}

export interface DynamicFeed {
  items?: RawDynamic[];
  offset?: string;
  has_more?: boolean | number;
  page?: number;
}
