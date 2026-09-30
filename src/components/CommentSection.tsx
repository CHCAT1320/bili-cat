import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import {
  hateComment,
  likeComment,
  sendComment,
  type CommentItem,
  type CommentPart,
} from "../bilibili/comment";
import {
  buildCommentRows,
  type CommentRow,
  type CommentTreeMode,
} from "../bilibili/commentTree";
import { useAccount } from "../hooks/useAccount";
import { useComments } from "../hooks/useComments";
import { useInView } from "../hooks/useInView";
import { useSubReplies } from "../hooks/useSubReplies";
import { CommentTree } from "./CommentTree";
import { CommentSexIcon, IconDislike, IconLike } from "./icons";
import { LoginDialog } from "./LoginDialog";
import "./CommentSection.css";

const MODES: CommentTreeMode[] = ["lineKeepMain", "lineCollapseMain", "indentOnly"];

interface CommentSectionProps {
  aid: number;
}

export function CommentSection({ aid }: CommentSectionProps) {
  const { t } = useTranslation();
  const account = useAccount();
  const comments = useComments(aid);
  const [draft, setDraft] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [mode, setMode] = useState<CommentTreeMode>("lineKeepMain");
  const loggedIn = Boolean(account.user?.isLogin);
  const requireLogin = () => setLoginOpen(true);

  const submit = async () => {
    if (!draft.trim() || comments.posting) return;
    const ok = await comments.send(draft);
    if (ok) setDraft("");
  };

  return (
    <section className="comments">
      <div className="commentsHead">
        <h2 className="commentsTitle">
          {t("comment.title")}
          {comments.total > 0 ? (
            <span className="commentsCount">{comments.total}</span>
          ) : null}
        </h2>
        <div className="commentSort">
          {[2, 0].map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === comments.sort
                  ? "commentSortButton commentSortButtonActive"
                  : "commentSortButton"
              }
              onClick={() => comments.setSort(value)}
            >
              {value === 2 ? t("comment.sortHot") : t("comment.sortNew")}
            </button>
          ))}
          <span className="commentSortDivider" aria-hidden="true" />
          {MODES.map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === mode
                  ? "commentSortButton commentSortButtonActive"
                  : "commentSortButton"
              }
              onClick={() => setMode(value)}
              title={t(`comment.mode.${value}.hint`)}
            >
              {t(`comment.mode.${value}.label`)}
            </button>
          ))}
        </div>
      </div>

      {loggedIn ? (
        <div className="commentCompose">
          <textarea
            className="commentInput"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("comment.placeholder")}
            rows={3}
            maxLength={1000}
          />
          <div className="commentComposeBar">
            {comments.postError ? (
              <span className="commentError">{comments.postError}</span>
            ) : (
              <span className="commentHint">{t("comment.hint")}</span>
            )}
            <button
              type="button"
              className="appButton"
              onClick={() => void submit()}
              disabled={!draft.trim() || comments.posting}
            >
              {comments.posting ? t("comment.sending") : t("comment.send")}
            </button>
          </div>
        </div>
      ) : (
        <div className="commentCompose">
          <button type="button" className="appButton" onClick={requireLogin}>
            {t("comment.loginToSend")}
          </button>
        </div>
      )}

      {comments.status === "error" ? (
        <p className="commentError">{comments.error}</p>
      ) : comments.status === "loading" && comments.items.length === 0 ? (
        <p className="commentHint">{t("main.loading")}</p>
      ) : comments.items.length === 0 ? (
        <p className="commentHint">{t("comment.empty")}</p>
      ) : (
        <ul className="commentList">
          {comments.items.map((comment) => (
            <TopThread
              key={comment.rpid}
              comment={comment}
              aid={aid}
              mode={mode}
              loggedIn={loggedIn}
              onRequireLogin={requireLogin}
            />
          ))}
        </ul>
      )}

      {comments.hasMore ? (
        <button
          type="button"
          className="appButton commentMore"
          onClick={comments.loadMore}
          disabled={comments.loadingMore}
        >
          {comments.loadingMore ? t("main.loading") : t("comment.more")}
        </button>
      ) : null}
      {comments.errorMore ? (
        <p className="commentError">{comments.errorMore}</p>
      ) : null}

      {!loggedIn ? (
        <Link className="commentHint" to="/mine">
          {t("comment.openMine")}
        </Link>
      ) : null}

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </section>
  );
}

/** 一个楼层：默认展开，加载全部子回复后交给 CommentTree 画树 */
function TopThread({
  comment,
  aid,
  mode,
  loggedIn,
  onRequireLogin,
}: {
  comment: CommentItem;
  aid: number;
  mode: CommentTreeMode;
  loggedIn: boolean;
  onRequireLogin: () => void;
}) {
  const { t } = useTranslation();
  const threadRef = useRef<HTMLLIElement | null>(null);
  const inView = useInView(threadRef);
  const subs = useSubReplies(aid, comment.rpid, inView);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // 子回复接口返回后优先用它；加载中/失败时先用接口内嵌的前几条
  const loaded = subs.items.length > 0;
  const replies = loaded ? subs.items : comment.replies;
  const done = loaded ? !subs.hasMore : comment.replies.length >= comment.rcount;
  const rootCollapsed = collapsed.has(comment.rpid);

  const rows = useMemo(
    () =>
      buildCommentRows({
        root: comment,
        replies,
        done,
        collapsed,
        mode,
      }),
    [comment, replies, done, collapsed, mode],
  );

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const treeEnabled = mode !== "indentOnly";

  return (
    <li className="commentThread" ref={threadRef}>
      <CommentTree rows={rows} enabled={treeEnabled} onToggle={toggle}>
        {rows.map((row) => (
          <CommentRowView
            key={row.comment.rpid}
            row={row}
            aid={aid}
            rootMid={comment.mid}
            isRoot={row.comment.rpid === comment.rpid}
            showToggle={treeEnabled}
            loggedIn={loggedIn}
            onRequireLogin={onRequireLogin}
            onToggle={() => toggle(row.comment.rpid)}
            onReplied={subs.reload}
          />
        ))}
      </CommentTree>

      {!done || (rootCollapsed && treeEnabled) ? (
        <div className="commentThreadMore">
          <button
            type="button"
            className="commentAction"
            onClick={() =>
              rootCollapsed && treeEnabled
                ? toggle(comment.rpid)
                : loaded
                  ? subs.loadMore()
                  : subs.reload()
            }
            disabled={subs.loading}
          >
            {subs.loading
              ? t("main.loading")
              : rootCollapsed && treeEnabled
                ? t("comment.expandCount", {
                    count: Math.max(comment.rcount, replies.length),
                  })
                : t("comment.moreReplies")}
          </button>
        </div>
      ) : null}
    </li>
  );
}

interface CommentRowViewProps {
  row: CommentRow;
  aid: number;
  rootMid: number;
  isRoot: boolean;
  /** indentOnly 模式不显示收起按钮 */
  showToggle: boolean;
  loggedIn: boolean;
  onRequireLogin: () => void;
  onToggle: () => void;
  onReplied: () => void;
}

function CommentRowView({
  row,
  aid,
  rootMid,
  isRoot,
  showToggle,
  loggedIn,
  onRequireLogin,
  onToggle,
  onReplied,
}: CommentRowViewProps) {
  const { t } = useTranslation();
  const comment = row.comment;
  const [like, setLike] = useState(comment.like);
  const [liked, setLiked] = useState(comment.liked);
  const [disliked, setDisliked] = useState(false);
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const toggleLike = async () => {
    if (!loggedIn) return onRequireLogin();
    const prev = { like, liked };
    const next = !liked;
    setLiked(next);
    setLike((value) => value + (next ? 1 : -1));
    try {
      await likeComment(aid, comment.rpid, next);
    } catch (cause) {
      setLiked(prev.liked);
      setLike(prev.like);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const toggleDislike = async () => {
    if (!loggedIn) return onRequireLogin();
    const next = !disliked;
    setDisliked(next);
    try {
      await hateComment(aid, comment.rpid, next);
    } catch (cause) {
      setDisliked(!next);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const submitReply = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await sendComment(aid, draft, {
        root: isRoot ? comment.rpid : comment.root || comment.parent || undefined,
        parent: comment.rpid,
      });
      setDraft("");
      setReplying(false);
      onReplied();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSending(false);
    }
  };

  const isHost = !isRoot && rootMid > 0 && comment.mid === rootMid;
  const style = {
    "--comment-depth": Math.min(row.depth, 10),
  } as React.CSSProperties;

  if (comment.missing) {
    return (
      <article
        className="commentTreeRow"
        data-comment-id={comment.rpid}
        style={style}
      >
        <span className="commentRowAvatar" data-comment-avatar aria-hidden="true">
          ?
        </span>
        <header className="commentRowHead commentRowMissing">
          {comment.uname ? <span>@{comment.uname}</span> : null}
          <span>{t("comment.missingParent")}</span>
        </header>
      </article>
    );
  }

  return (
    <article
      className={row.hideBody ? "commentTreeRow isCollapsedBody" : "commentTreeRow"}
      data-comment-id={comment.rpid}
      style={style}
    >
      <span className="commentRowAvatar" data-comment-avatar>
        {comment.avatar ? (
          <img src={comment.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />
        ) : null}
      </span>

      <header className="commentRowHead">
        <Link className="commentRowAuthor" to={`/space/${comment.mid}`}>
          {comment.uname}
        </Link>
        {comment.level > 0 ? (
          <span className="commentLevel">Lv{comment.level}</span>
        ) : null}
        <CommentSexIcon sex={comment.sex} />
        {isHost ? <span className="commentRowHost">{t("comment.host")}</span> : null}
        {comment.location ? (
          <span className="commentRowLocation">{comment.location}</span>
        ) : null}
      </header>

      {!row.hideBody ? (
        <>
          <p className="commentRowText">
            {comment.parts.length > 0
              ? comment.parts.map((part: CommentPart, index: number) =>
                  part.image ? (
                    <img
                      key={index}
                      className="commentRowEmoji"
                      src={part.image}
                      alt={part.text}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span key={index}>{part.text}</span>
                  ),
                )
              : comment.message}
          </p>

          {comment.pictures.length > 0 ? (
            <div className="commentRowPictures">
              {comment.pictures.map((picture, index) => (
                <span key={index} className="commentRowPicture">
                  <img
                    src={picture}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </span>
              ))}
            </div>
          ) : null}

          <footer className="commentRowFooter">
            <time>
              {new Date(comment.ctime * 1000).toLocaleString()}
            </time>
            <button
              type="button"
              className={liked ? "commentAction commentActionActive" : "commentAction"}
              onClick={() => void toggleLike()}
              aria-pressed={liked}
            >
              <IconLike size={14} /> {like > 0 ? like : ""}
            </button>
            <button
              type="button"
              className={disliked ? "commentAction commentActionActive" : "commentAction"}
              onClick={() => void toggleDislike()}
              aria-pressed={disliked}
              aria-label={t("comment.dislike")}
            >
              <IconDislike size={14} />
            </button>
            <button
              type="button"
              className="commentAction"
              onClick={() => (loggedIn ? setReplying((value) => !value) : onRequireLogin())}
            >
              {t("comment.reply")}
            </button>
            {showToggle && row.hasChildren ? (
              <button
                type="button"
                className="commentAction"
                onClick={onToggle}
                aria-expanded={!row.collapsed}
              >
                {row.collapsed
                  ? t("comment.expandCount", { count: comment.rcount })
                  : t("comment.collapse")}
              </button>
            ) : null}
          </footer>

          {error ? <p className="commentError">{error}</p> : null}

          {replying ? (
            <div className="commentReplyBox">
              <textarea
                className="commentInput commentInputSmall"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("comment.replyPlaceholder", { name: comment.uname })}
                rows={2}
                maxLength={1000}
              />
              <div className="commentReplyBar">
                <button
                  type="button"
                  className="appButton"
                  onClick={() => setReplying(false)}
                >
                  {t("comment.cancel")}
                </button>
                <button
                  type="button"
                  className="appButton"
                  onClick={() => void submitReply()}
                  disabled={!draft.trim() || sending}
                >
                  {sending ? t("comment.sending") : t("comment.send")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <footer className="commentRowFooter">
          {showToggle ? (
            <button type="button" className="commentAction" onClick={onToggle}>
              {t("comment.expandCount", { count: comment.rcount })}
            </button>
          ) : null}
        </footer>
      )}
    </article>
  );
}
