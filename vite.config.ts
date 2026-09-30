import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import Inspect from "vite-plugin-inspect";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;
// Vite DevTools 会把 UI 以 iframe 嵌进页面，在 Tauri WebView 里 RPC 握手会超时。
// 需要时用 VITE_DEVTOOLS=true 打开。
const devtools = process.env.VITE_DEVTOOLS === "true";

// https://vite.dev/config/
export default defineConfig(() => ({
  devtools,
  plugins: [react(), Inspect()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
