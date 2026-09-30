import { API, client } from "./index";

/** 视频评论的 type 固定为 1 */
export const COMMENT_TYPE_VIDEO = 1;

export interface CommentPart {
  text: string;
  image?: string;
}

export interface CommentItem {
  rpid: string;
  mid: number;
  uname: string;
  avatar: string;
  message: string;
  /** 正文按表情拆成的文本/图片片段 */
  parts: CommentPart[];
  /** 评论附图 */
  pictures: string[];
  /** 性别，用于小图标 */
  sex: string;
  like: number;
  /** 当前登录用户是否已点赞 */
  liked: boolean;
  ctime: number;
  /** 子评论总数 */
  rcount: number;
  /** 已内嵌的子评论（接口默认返回前 3 条） */
  replies: CommentItem[];
  /** 用户等级，用于 Lv 徽章 */
  level: number;
  /** IP 属地，如「山西」 */
  location: string;
  /** 被回复评论的 rpid，用于还原多层嵌套 */
  parent: string;
  /** 所属顶层评论 rpid */
  root: string;
}

export interface ReplyPage {
  page?: { count?: number; num?: number; size?: number };
  replies?: RawComment[];
}

export interface RawComment {
  rpid?: number | string;
  mid?: number;
  like?: number;
  action?: number;
  ctime?: number;
  rcount?: number;
  root?: number;
  parent?: number;
  member?: {
    mid?: number;
    uname?: string;
    avatar?: string;
    sex?: string;
    level_info?: { current_level?: number };
  };
  content?: {
    message?: string;
    emote?: Record<string, { url?: string }>;
    pictures?: Array<{ img_src?: string }>;
  };
  reply_control?: { location?: string };
  replies?: RawComment[] | null;
}

/** 去掉「IP属地：」前缀 */
export function normalizeLocation(value?: string): string {
  return typeof value === "string" ? value.replace(/^IP属地[:：\s]*/u, "") : "";
}

function httpsUrl(value?: string): string {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  return value.replace(/^http:\/\//, "https://");
}

function toParts(
  message: string,
  emote?: Record<string, { url?: string }>,
): CommentPart[] {
  const tokens = Object.keys(emote ?? {}).filter(Boolean).sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return message ? [{ text: message }] : [];
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "g");
  return message
    .split(pattern)
    .filter(Boolean)
    .map((text) => ({ text, image: httpsUrl(emote?.[text]?.url) || undefined }));
}

export function toComment(raw: RawComment): CommentItem {
  const message = raw.content?.message ?? "";
  return {
    rpid: String(raw.rpid ?? ""),
    mid: raw.mid ?? raw.member?.mid ?? 0,
    uname: raw.member?.uname ?? "",
    avatar: httpsUrl(raw.member?.avatar),
    message,
    parts: toParts(message, raw.content?.emote),
    pictures: (raw.content?.pictures ?? [])
      .map((picture) => httpsUrl(picture.img_src))
      .filter(Boolean),
    sex: raw.member?.sex ?? "",
    like: raw.like ?? 0,
    liked: raw.action === 1,
    ctime: raw.ctime ?? 0,
    rcount: raw.rcount ?? 0,
    replies: (raw.replies ?? []).map(toComment),
    level: raw.member?.level_info?.current_level ?? 0,
    location: normalizeLocation(raw.reply_control?.location),
    parent: raw.parent ? String(raw.parent) : "",
    root: raw.root ? String(raw.root) : "",
  };
}

export async function fetchComments(
  oid: number,
  page: number,
  sort: number,
  size = 20,
): Promise<{ items: CommentItem[]; count: number }> {
  const data = await client.request<ReplyPage>(API.common.comment.get, {
    params: { oid, type: COMMENT_TYPE_VIDEO, pn: page, ps: size, sort },
  });
  return {
    items: (data.replies ?? []).map(toComment),
    count: data.page?.count ?? 0,
  };
}

export async function fetchSubReplies(
  oid: number,
  root: string,
  page: number,
  size = 20,
): Promise<{ items: CommentItem[]; count: number }> {
  const data = await client.request<ReplyPage>(API.common.comment.sub_reply, {
    params: {
      oid,
      type: COMMENT_TYPE_VIDEO,
      root: Number(root),
      pn: page,
      ps: size,
    },
  });
  return {
    items: (data.replies ?? []).map(toComment),
    count: data.page?.count ?? 0,
  };
}

export interface ReplyTarget {
  /** 顶层评论的 rpid */
  root?: string;
  /** 被回复的那条评论 rpid */
  parent?: string;
}

export async function sendComment(
  oid: number,
  message: string,
  target: ReplyTarget = {},
): Promise<void> {
  await client.request(API.common.comment.send, {
    data: {
      oid,
      type: COMMENT_TYPE_VIDEO,
      message: message.trim(),
      plat: 2,
      root: target.root ? Number(target.root) : undefined,
      parent: target.parent ? Number(target.parent) : undefined,
    },
  });
}

/** 点赞/取消点赞评论 */
export async function likeComment(
  oid: number,
  rpid: string,
  liked: boolean,
): Promise<void> {
  await client.request(API.common.comment.like, {
    data: {
      oid,
      type: COMMENT_TYPE_VIDEO,
      rpid: Number(rpid),
      action: liked ? 1 : 0,
    },
  });
}

/** 点踩/取消点踩评论 */
export async function hateComment(
  oid: number,
  rpid: string,
  hated: boolean,
): Promise<void> {
  await client.request(API.common.comment.hate, {
    data: {
      oid,
      type: COMMENT_TYPE_VIDEO,
      rpid: Number(rpid),
      action: hated ? 1 : 0,
    },
  });
}

