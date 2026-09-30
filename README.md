# Bili-Cat

<img src="public/bili-cat-icon.svg" width="112" alt="Bili-Cat" />

> 更好用的 B 站桌面客户端

基于 Tauri 2 + React 构建的哔哩哔哩桌面客户端，一站式浏览推荐、搜索、番剧、动态与消息，支持高清播放、弹幕、树形评论与清晰度下载。

## 功能

- **首页推荐**：无限下拉的个性化推荐流，支持排行榜与视频搜索
- **高清播放**：DASH 高清画质、弹幕渲染，可分清晰度下载
- **树形评论**：多级回复、点赞、折叠与二级评论展开
- **动态与消息**：关注动态、热门动态，以及回复 / @ / 点赞 / 私信
- **番剧**：更新时间表与剧集详情
- **多语言**：简体中文 / English

## 技术栈

- [Tauri 2](https://tauri.app/)（Rust 后端）
- [React 19](https://react.dev/) + TypeScript + [Vite](https://vite.dev/)
- [i18next](https://www.i18next.com/) / react-i18next

## 开发

前置依赖：Node.js 20+、Rust 工具链，以及 [Tauri 各平台系统依赖](https://tauri.app/start/prerequisites/)。

```bash
npm install

npm run dev          # 仅启动前端（http://localhost:1420）
npm run tauri dev    # 启动完整桌面应用
npm run build        # 类型检查 + 前端构建
npm run tauri build  # 打包桌面安装包
npm run gen:api      # 由脚本生成 B 站接口端点定义
```

## 应用图标

- 图标源文件：`public/bili-cat-icon.svg`（B 站小电视造型 + 猫元素）
- Tauri 全平台图标位于 `src-tauri/icons/`，由 1024×1024 的 PNG 生成：

```bash
npx tauri icon path/to/icon-1024.png
```

> 注意：`tauri-build` 不会监听 `src-tauri/icons/` 的变化。替换图标后如需让已编译的二进制重新内嵌图标，先执行 `cargo clean -p bili-cat`（在 `src-tauri/` 下）再重新构建。
