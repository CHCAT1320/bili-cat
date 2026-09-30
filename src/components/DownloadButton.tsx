import { useState } from "react";
import { useTranslation } from "react-i18next";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { canDownload, downloadMedia } from "../utils/download";
import "./DownloadButton.css";

interface DownloadButtonProps {
  url: string;
  fileName: string;
  className?: string;
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
}: DownloadButtonProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: "idle" });

  if (!url) return null;

  const start = async () => {
    if (state.kind === "running") return;
    setState({ kind: "running", percent: 0 });
    try {
      const path = await downloadMedia({
        url,
        fileName,
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

  if (!canDownload()) return null;

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

  return (
    <button
      type="button"
      className={classes}
      onClick={() => void start()}
      disabled={state.kind === "running"}
    >
      {state.kind === "running"
        ? t("download.running", { percent: state.percent })
        : t("download.action")}
    </button>
  );
}
