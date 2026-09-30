import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDanmaku, type DanmakuItem } from "../bilibili/danmaku";
import type { LoadStatus } from "./status";

export interface DanmakuState {
  items: DanmakuItem[];
  status: LoadStatus;
  error: string;
  enabled: boolean;
  toggle: () => void;
  reload: () => void;
}

/** 弹幕只在 Tauri 里能取（需要 Rust 解压），拉不到就静默关掉 */
export function useDanmaku(cid: number): DanmakuState {
  const [items, setItems] = useState<DanmakuItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(true);
  const runId = useRef(0);

  const load = useCallback(() => {
    if (!cid || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      setStatus("ready");
      setItems([]);
      setEnabled(false);
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");

    void fetchDanmaku(cid)
      .then((data) => {
        if (run !== runId.current) return;
        setItems(data);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
        setItems([]);
      });
  }, [cid]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    status,
    error,
    enabled,
    toggle: () => setEnabled((value) => !value),
    reload: load,
  };
}
