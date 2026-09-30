import { openUrl } from "@tauri-apps/plugin-opener";

/** Tauri 下用系统浏览器打开，浏览器环境回退到新标签页 */
export function openExternal(url: string): void {
  void openUrl(url).catch(() => {
    window.open(url, "_blank", "noreferrer");
  });
}
