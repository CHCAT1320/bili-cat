import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import type { VideoId } from "../bilibili/videoId";
import type { LoadStatus } from "./status";

export interface VideoDetail {
  bvid: string;
  aid: number;
  cid: number;
  title: string;
  pic: string;
  desc: string;
  pubdate: number;
  duration: number;
  owner: { mid?: number; name?: string; face?: string };
  stat: {
    view?: number;
    danmaku?: number;
    reply?: number;
    like?: number;
    coin?: number;
    favorite?: number;
    share?: number;
  };
  pages: Array<{ cid: number; page: number; part: string; duration: number }>;
}

export interface VideoDetailState {
  video: VideoDetail | null;
  status: LoadStatus;
  error: string;
  reload: () => void;
}

function toParams(id: VideoId): Record<string, unknown> {
  return id.bvid ? { bvid: id.bvid } : { aid: id.aid };
}

export function useVideoDetail(id: VideoId | null): VideoDetailState {
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const runId = useRef(0);
  const key = id ? (id.bvid ?? String(id.aid)) : "";

  const load = useCallback(() => {
    const current = id;
    if (!current) {
      setError("无法识别的视频地址");
      setStatus("error");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");

    void client
      .request<VideoDetail>(API.video.info.info, { params: toParams(current) })
      .then((data) => {
        if (run !== runId.current) return;
        setVideo(data);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
    // id 是每次渲染新建的对象，用 key 作为依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { video, status, error, reload: load };
}
