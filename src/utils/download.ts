import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const PROGRESS_EVENT = "download://progress";

export interface DownloadProgress {
  id: string;
  received: number;
  total: number;
  done: boolean;
}

/** 非 Tauri 环境（纯浏览器预览）没有这个命令 */
export function canDownload(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * 交给 Rust 下载到「下载/bili-cat」目录。
 * 不能在 WebView 里直接下载：CDN 认 Referer，浏览器改不了请求头。
 */
export async function downloadMedia(options: {
  url: string;
  fileName: string;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<string> {
  const id = `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const unlisten = options.onProgress
    ? await listen<DownloadProgress>(PROGRESS_EVENT, (event) => {
        if (event.payload.id === id) options.onProgress?.(event.payload);
      })
    : null;

  try {
    return await invoke<string>("download_media", {
      id,
      url: options.url,
      fileName: options.fileName,
    });
  } finally {
    unlisten?.();
  }
}
