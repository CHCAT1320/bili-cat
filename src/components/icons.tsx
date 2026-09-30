interface IconProps {
  size?: number;
  className?: string;
}

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function IconLike({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 10.5V20H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7Z" />
      <path d="M7 10.5 11 3.6A1.8 1.8 0 0 1 14.2 5v3.5h4.2a2 2 0 0 1 2 2.4l-1.5 8A2 2 0 0 1 16.9 20H7" />
    </svg>
  );
}

export function IconDislike({ size = 16, className }: IconProps) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={{ transform: "scaleY(-1)" }}
    >
      <path d="M7 10.5V20H4.5A1.5 1.5 0 0 1 3 18.5v-6A1.5 1.5 0 0 1 4.5 11H7Z" />
      <path d="M7 10.5 11 3.6A1.8 1.8 0 0 1 14.2 5v3.5h4.2a2 2 0 0 1 2 2.4l-1.5 8A2 2 0 0 1 16.9 20H7" />
    </svg>
  );
}

export function IconComment({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20.5 11.5a8 8 0 0 1-8.1 7.9 8.6 8.6 0 0 1-3.3-.7L4 20.5l1.7-4.7A7.9 7.9 0 0 1 4.3 11.5 8 8 0 0 1 12.4 3.6 8 8 0 0 1 20.5 11.5Z" />
    </svg>
  );
}

export function IconRepost({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 9V7.5A2.5 2.5 0 0 1 6.5 5H17" />
      <path d="m14 2 3 3-3 3" />
      <path d="M20 15v1.5a2.5 2.5 0 0 1-2.5 2.5H7" />
      <path d="m10 22-3-3 3-3" />
    </svg>
  );
}

export function IconCoin({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 10h5M9.5 14h5" />
    </svg>
  );
}

export function IconStar({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3.2 14.6 9l5.9.8-4.3 4.2 1 6-5.2-2.9L6.8 20l1-6-4.3-4.2L9.4 9 12 3.2Z" />
    </svg>
  );
}

export function IconTriple({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13 2 4.5 13.5H11L10 22l9-12h-6.6L13 2Z" />
    </svg>
  );
}

export function IconShare({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6.5" />
      <path d="M12 15V3.5" />
      <path d="m8 7 4-3.5L16 7" />
    </svg>
  );
}

export function IconSend({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12 20 4l-7 16-2.2-6.2L4 12Z" />
    </svg>
  );
}

export function IconFolder({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.5.7l1 1.3h7.3A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
    </svg>
  );
}

export function IconPlay({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" className={className}>
      <path d="M6 4.5 19 12 6 19.5V4.5Z" />
    </svg>
  );
}

/** Bili-Cat 应用图标：B站小电视造型 + 猫元素（猫瞳/猫鼻/猫须） */
export function BiliCatLogo({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={className}
      role="img"
      aria-label="Bili-Cat"
    >
      <g stroke="#fb7299" strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M52 40 L30 12" />
        <path d="M76 40 L98 12" />
      </g>
      <rect x="10" y="36" width="108" height="78" rx="24" fill="#fb7299" />
      <rect x="38.5" y="54" width="15" height="30" rx="7.5" fill="#ffffff" />
      <rect x="74.5" y="54" width="15" height="30" rx="7.5" fill="#ffffff" />
      <ellipse cx="46" cy="69" rx="2.6" ry="8" fill="#3a2c33" />
      <ellipse cx="82" cy="69" rx="2.6" ry="8" fill="#3a2c33" />
      <circle cx="47.2" cy="65" r="1.3" fill="#ffffff" />
      <circle cx="83.2" cy="65" r="1.3" fill="#ffffff" />
      <path d="M59.5 87 L68.5 87 L64 92.5 Z" fill="#ffffff" />
      <path
        d="M64 92.5 C64 97 58.5 98 57 94.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M64 92.5 C64 97 69.5 98 71 94.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.92">
        <path d="M15 81 L33 85" />
        <path d="M15 93 L33 93" />
        <path d="M95 85 L113 81" />
        <path d="M95 93 L113 93" />
      </g>
    </svg>
  );
}

/** 性别图标，取自 BewlyCat（commentUserInfo.ts） */
export function CommentSexIcon({ sex, className }: { sex: string; className?: string }) {
  const male =
    "M20 4v6h-2V7.425l-3.975 3.95q.475.7.725 1.488T15 14.5q0 2.3-1.6 3.9T9.5 20q-2.3 0-3.9-1.6T4 14.5q0-2.3 1.6-3.9T9.5 9q.825 0 1.625.237t1.475.738L16.575 6H14V4zM9.5 11q-1.45 0-2.475 1.025T6 14.5q0 1.45 1.025 2.475T9.5 18q1.45 0 2.475-1.025T13 14.5q0-1.45-1.025-2.475T9.5 11";
  const female =
    "M11 21v-2H9v-2h2v-2.1q-1.975-.35-3.238-1.888T6.5 9.45q0-2.275 1.613-3.862T12 4t3.888 1.588T17.5 9.45q0 2.025-1.263 3.563T13 14.9V17h2v2h-2v2zm1-8q1.45 0 2.475-1.025T15.5 9.5q0-1.45-1.025-2.475T12 6q-1.45 0-2.475 1.025T8.5 9.5q0 1.45 1.025 2.475T12 13";
  if (sex !== "男" && sex !== "女") return null;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={sex === "男" ? "#00a1d6" : "#fb7299"}
      aria-hidden="true"
      className={className}
    >
      <path d={sex === "男" ? male : female} />
    </svg>
  );
}
