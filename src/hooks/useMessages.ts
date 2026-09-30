import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMessages,
  fetchNotifications,
  fetchSessions,
  sendMessage,
  type ChatMessage,
  type MessageKind,
  type NotificationItem,
  type SessionItem,
} from "../bilibili/message";
import type { LoadStatus } from "./status";

export interface NotificationsState {
  items: NotificationItem[];
  status: LoadStatus;
  error: string;
  retry: () => void;
}

export function useNotifications(
  kind: MessageKind,
  enabled: boolean,
): NotificationsState {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const runId = useRef(0);

  const load = useCallback(() => {
    if (!enabled) {
      setItems([]);
      setStatus("ready");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");
    void fetchNotifications(kind)
      .then((result) => {
        if (run !== runId.current) return;
        setItems(result.items);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [kind, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, status, error, retry: load };
}

export interface SessionsState {
  items: SessionItem[];
  status: LoadStatus;
  error: string;
  retry: () => void;
}

export function useSessions(enabled: boolean): SessionsState {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const runId = useRef(0);

  const load = useCallback(() => {
    if (!enabled) {
      setItems([]);
      setStatus("ready");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");
    void fetchSessions()
      .then((list) => {
        if (run !== runId.current) return;
        setItems(list);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, status, error, retry: load };
}

export interface ChatState {
  messages: ChatMessage[];
  status: LoadStatus;
  error: string;
  sending: boolean;
  sendError: string;
  send: (text: string) => Promise<boolean>;
}

export function useChat(
  selfMid: number,
  talkerId: number,
  sessionType: number,
): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const runId = useRef(0);

  useEffect(() => {
    if (!talkerId) {
      setMessages([]);
      setStatus("ready");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");
    void fetchMessages(talkerId, sessionType)
      .then((list) => {
        if (run !== runId.current) return;
        setMessages(list);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [talkerId, sessionType]);

  const send = useCallback(
    async (text: string) => {
      if (!talkerId || !text.trim()) return false;
      setSending(true);
      setSendError("");
      try {
        await sendMessage(selfMid, talkerId, sessionType, text.trim());
        setMessages((prev) => [
          ...prev,
          {
            key: `local-${Date.now()}`,
            senderUid: selfMid,
            time: Math.floor(Date.now() / 1000),
            msgType: 1,
            text: text.trim(),
          },
        ]);
        return true;
      } catch (cause) {
        setSendError(cause instanceof Error ? cause.message : String(cause));
        return false;
      } finally {
        setSending(false);
      }
    },
    [selfMid, talkerId, sessionType],
  );

  return { messages, status, error, sending, sendError, send };
}
