import type { CommentItem } from "./comment";

export type CommentTreeMode = "lineCollapseMain" | "lineKeepMain" | "indentOnly";

/** 父评论不在已加载列表里时补的占位节点 */
export interface MissingComment extends CommentItem {
  missing: true;
}

export interface CommentRow {
  comment: CommentItem & { missing?: boolean };
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  hideBody: boolean;
}

function placeholder(id: string, parentId: string, author: string): MissingComment {
  return {
    missing: true,
    rpid: id,
    mid: 0,
    uname: author,
    avatar: "",
    message: "",
    parts: [],
    pictures: [],
    sex: "",
    like: 0,
    liked: false,
    ctime: 0,
    rcount: 0,
    replies: [],
    level: 0,
    location: "",
    parent: parentId,
    root: "",
  };
}

/**
 * 移植自 BewlyCat（commentPreview.ts getCommentRows）：
 * 把「主评论 + 子回复」摊平成带 depth 的行列表，供树形渲染与 SVG 连线使用。
 * 子回复里 parent 指向未加载节点的，会补一个 @xxx 占位，避免断链。
 */
export function buildCommentRows(opts: {
  root: CommentItem;
  replies: CommentItem[];
  done: boolean;
  collapsed: Set<string>;
  mode: CommentTreeMode;
}): CommentRow[] {
  const { root, replies, done, collapsed: collapsedSet, mode } = opts;
  const all: Array<CommentItem & { missing?: boolean }> = [
    root,
    ...replies.filter((reply) => reply.rpid !== root.rpid),
  ];

  const byId = new Map<string, CommentItem & { missing?: boolean }>(
    all.map((comment) => [comment.rpid, comment]),
  );
  const orderById = new Map(all.map((comment, index) => [comment.rpid, index]));
  const known = new Map<string, CommentItem>();
  for (const comment of replies) known.set(comment.rpid, comment);

  // 补齐 parent 链：父节点缺失时按「回复 @xxx」推断昵称，生成占位
  const placeholders = new Map<string, MissingComment>();
  for (const comment of Array.from(byId.values())) {
    const parentId = comment.parent;
    if (comment === root || !parentId || parentId === comment.rpid) continue;
    const existing = byId.get(parentId);
    if (existing && !existing.missing) continue;
    const parentKnown = known.get(parentId);
    const message = comment.parts.map((part) => part.text).join("");
    const author =
      parentKnown?.uname ||
      /^(?:回复|回覆|Reply(?:\s+to)?)\s+@?([^\s:：]+)/iu.exec(message)?.[1] ||
      "";
    let parent = placeholders.get(parentId);
    if (!parent) {
      parent = placeholder(parentId, root.rpid, "");
      placeholders.set(parentId, parent);
      if (!orderById.has(parentId)) {
        orderById.set(parentId, orderById.get(comment.rpid) ?? 0);
      }
    }
    parent.parent = parentKnown?.parent || root.rpid;
    parent.uname = author || parent.uname;
    byId.set(parentId, parent);
  }

  // 归类到各自的父节点，防止环
  const children = new Map<string, Array<CommentItem & { missing?: boolean }>>();
  for (const comment of byId.values()) {
    if (comment.rpid === root.rpid) continue;
    let parentId = byId.has(comment.parent) ? comment.parent : root.rpid;
    const visited = new Set([comment.rpid]);
    let ancestor = byId.get(parentId);
    while (ancestor && ancestor !== root) {
      if (visited.has(ancestor.rpid)) {
        parentId = root.rpid;
        break;
      }
      visited.add(ancestor.rpid);
      ancestor = byId.get(ancestor.parent);
    }
    const siblings = children.get(parentId) ?? [];
    siblings.push(comment);
    children.set(parentId, siblings);
  }
  children.forEach((siblings) =>
    siblings.sort(
      (a, b) => (orderById.get(a.rpid) ?? 0) - (orderById.get(b.rpid) ?? 0),
    ),
  );

  const rows: CommentRow[] = [];
  const stack: Array<{
    comment: CommentItem & { missing?: boolean };
    depth: number;
    parentId: string | null;
  }> = [{ comment: root, depth: 0, parentId: null }];

  while (stack.length) {
    const { comment, depth, parentId } = stack.pop()!;
    const descendants = children.get(comment.rpid) ?? [];
    const hasChildren = descendants.length > 0 || (comment === root && !done);
    const collapsed =
      mode !== "indentOnly" && hasChildren && collapsedSet.has(comment.rpid);
    rows.push({
      comment,
      parentId,
      depth,
      hasChildren,
      collapsed,
      hideBody: collapsed && mode === "lineCollapseMain",
    });
    if (!collapsed) {
      for (let index = descendants.length - 1; index >= 0; index--) {
        stack.push({
          comment: descendants[index],
          depth: depth + 1,
          parentId: comment.rpid,
        });
      }
    }
  }

  return rows;
}
