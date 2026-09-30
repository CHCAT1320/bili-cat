import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { MessageKind } from "../bilibili/message";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { LoginDialog } from "../components/LoginDialog";
import { useAccount } from "../hooks/useAccount";
import { useChat, useNotifications, useSessions } from "../hooks/useMessages";
import "./Message.css";

type Tab = MessageKind | "sessions";

const TABS: Tab[] = ["replies", "at", "likes", "sessions"];

function Message() {
  const { t } = useTranslation();
  const account = useAccount();
  const loggedIn = Boolean(account.user?.isLogin);
  const mid = account.user?.mid ?? 0;
  const [tab, setTab] = useState<Tab>("replies");
  const [loginOpen, setLoginOpen] = useState(false);
  const [selected, setSelected] = useState<{ id: number; type: number } | null>(
    null,
  );

  const notifications = useNotifications(
    tab === "sessions" ? "replies" : tab,
    loggedIn && tab !== "sessions",
  );
  const sessions = useSessions(loggedIn && tab === "sessions");
  const chat = useChat(mid, selected?.id ?? 0, selected?.type ?? 1);
  const activeSession = sessions.items.find(
    (session) => session.talkerId === selected?.id,
  );

  return (
    <div className="messagePage">
      <AppHeader />
      <div className="messageBody">
        <div className="messageTabs">
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === tab ? "messageTab messageTabActive" : "messageTab"}
              onClick={() => setTab(value)}
            >
              {t(`message.tab.${value}`)}
            </button>
          ))}
        </div>

        {!loggedIn ? (
          <div className="statePanel">
            <span>{t("message.needLogin")}</span>
            <button
              type="button"
              className="appButton"
              onClick={() => setLoginOpen(true)}
            >
              {t("login.action")}
            </button>
          </div>
        ) : tab === "sessions" ? (
          <div className="messageSessions">
            <div className="sessionList">
              {sessions.status === "error" ? (
                <FeedError message={sessions.error} onRetry={sessions.retry} />
              ) : sessions.status === "loading" && sessions.items.length === 0 ? (
                <FeedSkeleton />
              ) : sessions.items.length === 0 ? (
                <p className="messageHint">{t("message.empty")}</p>
              ) : (
                <ul className="sessionItems">
                  {sessions.items.map((session) => (
                    <li key={`${session.talkerId}-${session.sessionType}`}>
                      <button
                        type="button"
                        className={
                          selected?.id === session.talkerId
                            ? "sessionItem sessionItemActive"
                            : "sessionItem"
                        }
                        onClick={() =>
                          setSelected({
                            id: session.talkerId,
                            type: session.sessionType,
                          })
                        }
                      >
                        {session.face ? (
                          <img
                            className="sessionAvatar"
                            src={session.face}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="sessionAvatar" />
                        )}
                        <span className="sessionInfo">
                          <span className="sessionName">
                            {session.name || `UID ${session.talkerId}`}
                          </span>
                          <span className="sessionLast">{session.lastText}</span>
                        </span>
                        {session.unread > 0 ? (
                          <span className="sessionUnread">{session.unread}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="sessionChat">
              {!selected ? (
                <p className="messageHint">{t("message.pickSession")}</p>
              ) : chat.status === "error" ? (
                <p className="messageError">{chat.error}</p>
              ) : (
                <>
                  <div className="sessionChatHead">
                    {activeSession?.face ? (
                      <img
                        className="sessionChatAvatar"
                        src={activeSession.face}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <Link
                      className="sessionChatName"
                      to={`/space/${selected.id}`}
                    >
                      {activeSession?.name || `UID ${selected.id}`}
                    </Link>
                  </div>
                  <div className="chatMessages">
                    {chat.status === "loading" && chat.messages.length === 0 ? (
                      <p className="messageHint">{t("main.loading")}</p>
                    ) : (
                      chat.messages.map((message) => (
                        <div
                          key={message.key}
                          className={
                            message.senderUid === mid
                              ? "chatBubble chatBubbleMine"
                              : "chatBubble"
                          }
                        >
                          <p className="chatText">{message.text}</p>
                          <span className="chatTime">
                            {message.time
                              ? new Date(message.time * 1000).toLocaleTimeString()
                              : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <ChatComposer
                    sending={chat.sending}
                    error={chat.sendError}
                    onSend={chat.send}
                  />
                </>
              )}
            </div>
          </div>
        ) : notifications.status === "error" ? (
          <FeedError message={notifications.error} onRetry={notifications.retry} />
        ) : notifications.status === "loading" &&
          notifications.items.length === 0 ? (
          <FeedSkeleton />
        ) : notifications.items.length === 0 ? (
          <p className="messageHint">{t("message.empty")}</p>
        ) : (
          <ul className="noticeList">
            {notifications.items.map((item) => (
              <li key={item.id} className="noticeItem">
                <Link
                  className="noticeAvatarLink"
                  to={item.mid ? `/space/${item.mid}` : "#"}
                >
                  {item.avatar ? (
                    <img
                      className="noticeAvatar"
                      src={item.avatar}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="noticeAvatar" />
                  )}
                </Link>
                <div className="noticeBody">
                  {item.mid ? (
                    <Link className="noticeName" to={`/space/${item.mid}`}>
                      {item.nickname}
                    </Link>
                  ) : (
                    <p className="noticeName">{item.nickname}</p>
                  )}
                  <p className="noticeText">{item.text}</p>
                </div>
                <span className="noticeTime">
                  {item.time ? new Date(item.time * 1000).toLocaleString() : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

function ChatComposer({
  sending,
  error,
  onSend,
}: {
  sending: boolean;
  error: string;
  onSend: (text: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  const submit = async () => {
    if (!draft.trim() || sending) return;
    const ok = await onSend(draft);
    if (ok) setDraft("");
  };

  return (
    <div className="chatComposer">
      <textarea
        className="chatInput"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t("message.inputPlaceholder")}
        rows={2}
        maxLength={500}
      />
      <div className="chatComposerBar">
        {error ? <span className="messageError">{error}</span> : null}
        <button
          type="button"
          className="appButton"
          onClick={() => void submit()}
          disabled={!draft.trim() || sending}
        >
          {sending ? t("comment.sending") : t("comment.send")}
        </button>
      </div>
    </div>
  );
}

export default Message;
