import { useEffect, useRef } from "react";
import type { DashTrack } from "../hooks/usePlayUrl";
import { streamUrl } from "../utils/stream";

/** 单次请求的字节数，与 Rust 代理的 MAX_CHUNK 对齐 */
const CHUNK = 4 * 1024 * 1024;
/** 缓冲区领先播放位置的最大秒数，超过就暂停预取 */
const MAX_AHEAD = 60;

interface DashVideoProps {
  video: DashTrack;
  audio: DashTrack;
  onElement: (element: HTMLVideoElement | null) => void;
  onAutoMuted: () => void;
}

interface TrackLoader {
  url: string;
  buffer: SourceBuffer | null;
  next: number;
  total: number;
  updating: boolean;
  done: boolean;
  started: boolean;
}

/**
 * 用 MSE 播放 B 站 DASH 流（音视频分开），以支持需要登录/大会员的高清档位。
 * 分片请求走 `bilistream` 代理（补 Referer），并用 `__range` 查询参数传字节区间，
 * 避免跨域 fetch 因 Range 头触发预检。
 */
export function DashVideo({ video, audio, onElement, onAutoMuted }: DashVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoMutedRef = useRef(onAutoMuted);
  autoMutedRef.current = onAutoMuted;

  useEffect(() => {
    onElement(videoRef.current);
    return () => onElement(null);
  }, [onElement]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    const videoUrl = streamUrl(video.url);
    const audioUrl = streamUrl(audio.url);
    if (!videoUrl || !audioUrl || typeof MediaSource === "undefined") return;

    const mediaSource = new MediaSource();
    const objectUrl = URL.createObjectURL(mediaSource);
    element.src = objectUrl;
    let disposed = false;

    const makeLoader = (url: string, track: DashTrack): TrackLoader => ({
      url,
      buffer: null,
      next: track.mediaStart,
      total: 0,
      updating: false,
      done: false,
      started: false,
    });
    const videoLoader = makeLoader(videoUrl, video);
    const audioLoader = makeLoader(audioUrl, audio);

    const bufferedAhead = () => {
      if (element.buffered.length === 0) return 0;
      return element.buffered.end(element.buffered.length - 1) - element.currentTime;
    };

    const append = (loader: TrackLoader, bytes: Uint8Array) =>
      new Promise<void>((resolve) => {
        const buffer = loader.buffer;
        if (!buffer) {
          resolve();
          return;
        }
        loader.updating = true;
        const onEnd = () => {
          buffer.removeEventListener("updateend", onEnd);
          loader.updating = false;
          resolve();
        };
        buffer.addEventListener("updateend", onEnd);
        try {
          buffer.appendBuffer(bytes as unknown as BufferSource);
        } catch {
          buffer.removeEventListener("updateend", onEnd);
          loader.updating = false;
          resolve();
        }
      });

    const fetchRange = async (url: string, start: number, end: number) => {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(`${url}${separator}__range=${start}-${end}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const contentRange = response.headers.get("Content-Range");
      let realEnd = start + bytes.byteLength - 1;
      let total = 0;
      if (contentRange) {
        const match = /bytes (\d+)-(\d+)\/(\d+)/.exec(contentRange);
        if (match) {
          realEnd = Number(match[2]);
          total = Number(match[3]);
        }
      }
      return { bytes, end: realEnd, total };
    };

    const pump = async (loader: TrackLoader) => {
      if (disposed || loader.done || loader.updating || !loader.buffer) return;
      if (loader.started && bufferedAhead() > MAX_AHEAD) return;
      try {
        const { bytes, end, total } = await fetchRange(
          loader.url,
          loader.next,
          loader.next + CHUNK - 1,
        );
        if (disposed) return;
        loader.started = true;
        loader.total = total;
        loader.next = end + 1;
        if (total > 0 && loader.next >= total) loader.done = true;
        await append(loader, bytes);
        void pump(loader);
      } catch {
        loader.done = true;
      }
    };

    const onSourceOpen = () => {
      try {
        videoLoader.buffer = mediaSource.addSourceBuffer(video.mime);
        audioLoader.buffer = mediaSource.addSourceBuffer(audio.mime);
      } catch {
        return;
      }
      void (async () => {
        try {
          const initVideo = await fetchRange(videoUrl, video.initStart, video.initEnd);
          await append(videoLoader, initVideo.bytes);
          const initAudio = await fetchRange(audioUrl, audio.initStart, audio.initEnd);
          await append(audioLoader, initAudio.bytes);
        } catch {
          return;
        }
        if (disposed) return;
        void pump(videoLoader);
        void pump(audioLoader);
      })();
    };

    mediaSource.addEventListener("sourceopen", onSourceOpen);

    const tryPlay = () => {
      const attempt = element.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(() => {
          element.muted = true;
          autoMutedRef.current();
          void element.play().catch(() => {});
        });
      }
    };
    const onCanPlay = () => {
      tryPlay();
    };
    element.addEventListener("canplay", onCanPlay);

    const resume = () => {
      if (bufferedAhead() < MAX_AHEAD * 0.5) {
        void pump(videoLoader);
        void pump(audioLoader);
      }
    };
    element.addEventListener("timeupdate", resume);

    return () => {
      disposed = true;
      mediaSource.removeEventListener("sourceopen", onSourceOpen);
      element.removeEventListener("canplay", onCanPlay);
      element.removeEventListener("timeupdate", resume);
      try {
        if (mediaSource.readyState === "open") mediaSource.endOfStream();
      } catch {
        /* 清理失败可忽略 */
      }
      URL.revokeObjectURL(objectUrl);
    };
    // track 对象在换清晰度时会整体替换，用 video/audio 作为依赖即可
  }, [video, audio]);

  return (
    <video
      ref={videoRef}
      className="videoMedia"
      controls
      autoPlay
      playsInline
      preload="metadata"
    />
  );
}
