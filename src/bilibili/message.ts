import { API, client } from "./index";
import { coverUrl } from "./feed";

export type MessageKind = "replies" | "at" | "likes";

export interface NotificationItem {
  id: string;
  mid: number;
  nickname: string;
  avatar: string;
  text: string;
  time: number;
  uri?: string;
}

interface RawNotification {
  id?: number | string;
  id_str?: string;
  user?: { mid?: number; nickname?: string; avatar?: string };
  item?: {
    title?: string;
    source_content?: string;
    uri?: string;
    subject?: string;
  };
  reply?: { content?: { message?: string } };
  title?: string;
  source_content?: string;
  counts?: number;
  reply_time?: number;
  at_time?: number;
  like_time?: number;
  time?: number;
}

function textOf(raw: RawNotification): string {
  return (
    raw.reply?.content?.message ??
    raw.item?.source_content ??
    raw.source_content ??
    raw.item?.title ??
    raw.title ??
    raw.item?.subject ??
    ""
  );
}

export interface NotificationFeed {
  items?: RawNotification[];
  cursor?: { is_end?: boolean };
}

function mapNotification(raw: RawNotification): NotificationItem | null {
  const id = String(raw.id_str ?? raw.id ?? "");
  if (!id) return null;
  return {
    id,
    mid: raw.user?.mid ?? 0,
    nickname: raw.user?.nickname ?? "",
    avatar: coverUrl(raw.user?.avatar ?? ""),
    text: textOf(raw),
    time: raw.reply_time ?? raw.at_time ?? raw.like_time ?? raw.time ?? 0,
    uri: raw.item?.uri,
  };
}

export async function fetchNotifications(
  kind: MessageKind,
): Promise<{ items: NotificationItem[]; hasMore: boolean }> {
  type Endpoint = (typeof API.session.session)[MessageKind];
  const endpoint: Endpoint =
    kind === "replies"
      ? API.session.session.replies
      : kind === "at"
        ? API.session.session.at
        : API.session.session.likes;

  // 三个消息流都必须带 platform/mobi_app/build 等 Web 端参数，否则会返回空或报错
  const params: Record<string, unknown> = {
    platform: "web",
    mobi_app: "web",
    build: 0,
    pn: 1,
    ps: 20,
  };
  if (kind === "replies") {
    params.id = 0;
    params.reply_time = 0;
  } else if (kind === "at") {
    params.id = 0;
    params.at_time = 0;
  } else {
    params.like_time = 0;
  }

  const data = await client.request<NotificationFeed>(
    { ...endpoint, wbi: true },
    { params },
  );
  const items = (data?.items ?? [])
    .map(mapNotification)
    .filter((item): item is NotificationItem => Boolean(item));
  return { items, hasMore: !data?.cursor?.is_end };
}

export interface SessionItem {
  talkerId: number;
  sessionType: number;
  unread: number;
  timestamp: number;
  lastText: string;
  name: string;
  face: string;
}

interface RawSession {
  talker_id?: number;
  session_type?: number;
  unread_count?: number;
  last_msg?: { content?: string; timestamp?: number; msg_type?: number };
}

function parseContent(content: string | undefined): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const value = parsed.content ?? parsed.title ?? parsed.text;
    return typeof value === "string" ? value : content;
  } catch {
    return content;
  }
}

export async function fetchSessions(): Promise<SessionItem[]> {
  const data = await client.request<{ session_list?: RawSession[] }>(
    API.session.session.get,
    {
      params: {
        session_type: 1,
        group_fold: 1,
        unfollow_fold: 0,
        sort_rule: 2,
        build: 0,
        mobi_app: "web",
      },
    },
  );
  const sessions = (data?.session_list ?? [])
    .filter((session) => (session.talker_id ?? 0) > 0)
    .slice(0, 30)
    .map((session) => ({
      talkerId: session.talker_id as number,
      sessionType: session.session_type ?? 1,
      unread: session.unread_count ?? 0,
      timestamp: session.last_msg?.timestamp ?? 0,
      lastText: parseContent(session.last_msg?.content),
      name: "",
      face: "",
    }));

  // 会话列表不带昵称/头像，逐个补一下（失败就退回 UID 显示）
  await Promise.all(
    sessions.map(async (session) => {
      try {
        const profile = await client.request<{ name?: string; face?: string }>(
          API.user.info.info,
          { params: { mid: session.talkerId } },
        );
        session.name = profile?.name ?? "";
        session.face = coverUrl(profile?.face ?? "");
      } catch {
        /* 忽略 */
      }
    }),
  );

  return sessions;
}

export interface ChatMessage {
  key: string;
  senderUid: number;
  time: number;
  msgType: number;
  text: string;
}

interface RawMessage {
  msg_key?: number | string;
  sender_uid?: number;
  timestamp?: number;
  msg_type?: number;
  content?: string;
}

export async function fetchMessages(
  talkerId: number,
  sessionType: number,
): Promise<ChatMessage[]> {
  const data = await client.request<{ messages?: RawMessage[] }>(
    API.session.session.fetch,
    {
      params: {
        talker_id: talkerId,
        session_type: sessionType,
        begin_seqno: 0,
        build: 0,
        mobi_app: "web",
      },
    },
  );
  return (data?.messages ?? [])
    .map((message, index) => ({
      key: String(message.msg_key ?? index),
      senderUid: message.sender_uid ?? 0,
      time: message.timestamp ?? 0,
      msgType: message.msg_type ?? 0,
      text: parseContent(message.content),
    }))
    .sort((a, b) => a.time - b.time);
}

export async function sendMessage(
  selfMid: number,
  talkerId: number,
  sessionType: number,
  text: string,
): Promise<void> {
  await client.request(API.session.operate.send_msg, {
    params: {
      sender_uid: selfMid,
      receiver_id: talkerId,
      build: 0,
      mobi_app: "web",
    },
    data: {
      "msg[sender_uid]": selfMid,
      "msg[receiver_id]": talkerId,
      "msg[receiver_type]": sessionType,
      "msg[msg_type]": 1,
      "msg[msg_status]": 0,
      "msg[content]": JSON.stringify({ content: text }),
    },
  });
}
