import { useState } from "react";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { PlayQuality } from "../hooks/usePlayUrl";
import { canDownload, downloadMedia } from "../utils/download";
import "./DownloadButton.css";

interface DownloadButtonProps {
  /** 预取的默认（通常是最佳）合轨地址 */
  url: string;
  /** 文件名主体，不带扩展名；带清晰度选择时会再拼上 «720p» 等 */
  fileName: string;
  className?: string;
  /** 可选的清晰度列表；提供后显示下拉选择 */
  qualities?: PlayQuality[];
  /** 默认选中的清晰度 */
  quality?: number;
  /** 按清晰度解析下载地址（DASH 播放时用） */
  resolve?: (quality: number) => Promise<{ url: string; quality: number }>;
}

type State =
  | { kind: "idle" }
  | { kind: "running"; percent: number }
  | { kind: "done"; path: string }
  | { kind: "error"; message: string };

export function DownloadButton({
  url,
  fileName,
  className,
  qualities,
  quality,
  resolve,
}: DownloadButtonProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [selected, setSelected] = useState(quality ?? 0);

  const selectable = Boolean(qualities && qualities.length > 1 && resolve);
  if (!canDownload()) return null;
  if (!url && !selectable) return null;

  const start = async () => {
    if (state.kind === "running") return;
    setState({ kind: "running", percent: 0 });
    try {
      let targetUrl = url;
      let targetQuality = quality ?? 0;
      // 选了与预取不同的清晰度时，现取该清晰度的合轨地址
      if (selectable && resolve && selected && selected !== quality) {
        const resolved = await resolve(selected);
        targetUrl = resolved.url;
        targetQuality = resolved.quality;
      }
      const name = selectable && targetQuality
        ? `${fileName}-${targetQuality}p`
        : fileName;
      const path = await downloadMedia({
        url: targetUrl,
        fileName: name,
        onProgress: (progress) => {
          const percent = progress.total
            ? Math.min(99, Math.round((progress.received / progress.total) * 100))
            : 0;
          setState({ kind: "running", percent });
        },
      });
      setState({ kind: "done", path });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const classes = className ? `downloadButton ${className}` : "downloadButton";

  if (state.kind === "done") {
    return (
      <button
        type="button"
        className={classes}
        title={state.path}
        onClick={() => void revealItemInDir(state.path).catch(() => {})}
      >
        {t("download.openFolder")}
      </button>
    );
  }

  if (state.kind === "error") {
    return (
      <button
        type="button"
        className={classes}
        title={state.message}
        onClick={() => void start()}
      >
        {t("download.retry")}
      </button>
    );
  }

  const running = state.kind === "running";

  return (
    <span className="downloadGroup">
      {selectable ? (
        <select
          className="downloadQuality"
          value={selected}
          onChange={(event) => setSelected(Number(event.target.value))}
          disabled={running}
          aria-label={t("download.quality")}
        >
          {(qualities ?? []).map((item) => (
            <option key={item.quality} value={item.quality}>
              {item.label}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        className={classes}
        onClick={() => void start()}
        disabled={running}
      >
        {running
          ? t("download.running", { percent: state.percent })
          : t("download.action")}
      </button>
    </span>
  );
}
