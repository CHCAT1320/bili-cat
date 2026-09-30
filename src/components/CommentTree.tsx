import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { CommentRow } from "../bilibili/commentTree";
import {
  getCommentReplyBranchPath,
  getCommentReplyBranchToggleY,
  type CommentReplyAvatarAnchor,
  type CommentReplyTreeBranch,
} from "../utils/commentReplyTree";
import "../utils/commentReplyTree.css";
import "./CommentTree.css";

interface Guide {
  key: string;
  path: string;
  x: number;
  y: number;
  collapsed: boolean;
}

interface CommentTreeProps {
  rows: CommentRow[];
  /** indentOnly 模式不画线 */
  enabled: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

/**
 * 移植自 BewlyCat（MomentCommentTree.vue）：
 * 测量每条评论头像的位置，用一层 SVG 覆盖画主干 + 1/4 圆弧分支，
 * 折叠圆点（+ / −）画在分支上，点击即可展开/收起该楼层。
 */
export function CommentTree({ rows, enabled, onToggle, children }: CommentTreeProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement | null>(null);
  const [indentStep, setIndentStep] = useState(24);
  const [guides, setGuides] = useState<Guide[]>([]);
  const frame = useRef(0);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const update = useCallback(() => {
    frame.current = 0;
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const list = rowsRef.current;
    const depth = Math.max(1, ...list.map((row) => Math.min(row.depth, 10)));
    // 与原生评论一致：优先保留正文宽度，同时给父子头像间的圆弧留空间
    const step = Math.max(16, Math.min(24, Math.floor((rect.width - 150 - 36) / depth)));
    setIndentStep((prev) => (prev === step ? prev : step));

    if (!enabledRef.current) {
      setGuides((prev) => (prev.length ? [] : prev));
      return;
    }

    const anchors = new Map<string, CommentReplyAvatarAnchor>();
    for (const rowElement of Array.from(
      element.querySelectorAll<HTMLElement>("[data-comment-id]"),
    )) {
      const avatar = rowElement.querySelector<HTMLElement>("[data-comment-avatar]");
      if (!avatar) continue;
      const avatarRect = avatar.getBoundingClientRect();
      const footer = rowElement.querySelector("footer")?.getBoundingClientRect();
      const row = list.find((item) => item.comment.rpid === rowElement.dataset.commentId);
      const centerY = avatarRect.top + avatarRect.height / 2 - rect.top;
      anchors.set(rowElement.dataset.commentId!, {
        bottom: row?.hideBody ? centerY : avatarRect.bottom - rect.top,
        centerX: avatarRect.left + avatarRect.width / 2 - rect.left,
        centerY,
        left: avatarRect.left - rect.left,
        toggleY: footer ? footer.top + footer.height / 2 - rect.top : centerY,
      });
    }

    const nextGuides: Guide[] = [];
    for (const row of list) {
      const parentAnchor = anchors.get(row.comment.rpid);
      if (!row.hasChildren || !parentAnchor) continue;
      const childAnchors = list
        .filter((child) => child.parentId === row.comment.rpid)
        .map((child) => anchors.get(child.comment.rpid))
        .filter(
          (anchor): anchor is CommentReplyAvatarAnchor =>
            Boolean(anchor && anchor.left > parentAnchor.centerX),
        );
      const branch: CommentReplyTreeBranch = {
        key: row.comment.rpid,
        parentAuthorName: row.comment.uname,
        parentAnchor,
        childAnchors,
        collapsed: row.collapsed,
        collapseParentBody: row.hideBody,
      };
      const path = getCommentReplyBranchPath(branch, 12, 12);
      if (path) {
        nextGuides.push({
          key: row.comment.rpid,
          path,
          x: parentAnchor.centerX,
          y: getCommentReplyBranchToggleY(branch, 12),
          collapsed: row.collapsed,
        });
      }
    }

    setGuides((prev) =>
      JSON.stringify(prev) === JSON.stringify(nextGuides) ? prev : nextGuides,
    );
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = window.requestAnimationFrame(update);
  }, [update]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => observer.disconnect();
  }, [schedule]);

  useLayoutEffect(() => {
    schedule();
  });

  useEffect(() => {
    schedule();
  }, [rows, enabled, schedule]);

  useEffect(
    () => () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    },
    [],
  );

  // 收起后子节点会被移出 rows；这里同步过滤掉对应的旧连线，
  // 避免测量更新前那一帧还残留「已收起的那部分树」。
  const visibleKeys = useMemo(
    () => new Set(rows.map((row) => row.comment.rpid)),
    [rows],
  );
  const shownGuides = guides.filter((guide) => visibleKeys.has(guide.key));

  return (
    <section
      ref={containerRef}
      className="commentTree"
      style={{ "--commentIndentStep": `${indentStep}px` } as CSSProperties}
      onLoadCapture={schedule}
    >
      {children}
      {enabled ? (
        <>
          <svg
            className="commentTreeGuides"
            focusable="false"
            aria-hidden="true"
          >
            {shownGuides.map((guide) => (
              <path
                key={guide.key}
                className="commentTreeBranchLine"
                d={guide.path}
              />
            ))}
          </svg>
          {shownGuides.map((guide) => (
            <button
              key={guide.key}
              type="button"
              className="commentTreeNode"
              style={{ left: `${guide.x}px`, top: `${guide.y}px` }}
              aria-expanded={!guide.collapsed}
              aria-label={guide.collapsed ? t("comment.expand") : t("comment.collapse")}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(guide.key);
              }}
            >
              {guide.collapsed ? "+" : "−"}
            </button>
          ))}
        </>
      ) : null}
    </section>
  );
}
