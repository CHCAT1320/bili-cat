interface TauriInternals {
  convertFileSrc?: (path: string, protocol?: string) => string;
}

/**
 * 把 B 站 CDN 地址转成走 Rust 代理的本地地址。
 * 非 Tauri 环境（纯浏览器预览）返回空串，调用方需自行回退。
 * 之所以要代理：*.bilivideo.com 只认 `Referer: https://www.bilibili.com`，
 * WebView 直接请求会 403，而 <video> 无法自定义请求头。
 */
export function streamUrl(source: string): string {
  if (!source) return "";
  const internals = (
    window as unknown as { __TAURI_INTERNALS__?: TauriInternals }
  ).__TAURI_INTERNALS__;
  if (!internals?.convertFileSrc) return "";
  return internals.convertFileSrc(source, "bilistream");
}
