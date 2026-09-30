import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import type { LoadStatus } from "./status";

/** fnval=4048：DASH + HDR + 4K + 杜比音频 + 杜比视界 + 8K + AV1 */
const FNVAL_DASH = 4048;
/** fnval=1：渐进式 mp4（音视频合轨），作为 MSE 不可用时的兜底 */
const FNVAL_PROGRESSIVE = 1;
const PREFERRED_QUALITY = 80;

export interface DashTrack {
  url: string;
  /** 可直接喂给 MediaSource.addSourceBuffer 的 mime */
  mime: string;
  initStart: number;
  initEnd: number;
  /** 首个媒体分片的起始字节（跳过 sidx 索引） */
  mediaStart: number;
}

export interface PlayQuality {
  quality: number;
  label: string;
}

export interface PlayUrlState {
  status: LoadStatus;
  error: string;
  kind: "none" | "progressive" | "dash";
  /** 渐进式地址（用于播放） */
  source: string;
  /** 供下载用的合轨 mp4 地址；DASH 播放时单独请求 fnval=1 得到 */
  downloadUrl: string;
  dash: { video: DashTrack; audio: DashTrack } | null;
  qualities: PlayQuality[];
  quality: number;
  selectQuality: (quality: number) => void;
  /** 按指定清晰度取一个可下载的合轨 mp4 地址 */
  resolveDownload: (quality: number) => Promise<{ url: string; quality: number }>;
  retry: () => void;
}

interface DashStream {
  id?: number;
  baseUrl?: string;
  base_url?: string;
  backupUrl?: string[];
  bandwidth?: number;
  mimeType?: string;
  mime_type?: string;
  codecs?: string;
  segment_base?: { initialization?: string; index_range?: string };
  segmentBase?: { Initialization?: string; indexRange?: string };
}

interface PlayUrlResponse {
  quality?: number;
  accept_quality?: number[];
  support_formats?: Array<{ quality: number; new_description: string }>;
  durl?: Array<{ url: string }>;
  dash?: { video?: DashStream[]; audio?: DashStream[] };
}

const EMPTY: Omit<
  PlayUrlState,
  "selectQuality" | "retry" | "resolveDownload"
> = {
  status: "loading",
  error: "",
  kind: "none",
  source: "",
  downloadUrl: "",
  dash: null,
  qualities: [],
  quality: 0,
};

function parseRange(value: string | undefined): [number, number] | null {
  if (!value) return null;
  const [start, end] = value.split("-");
  const s = Number(start);
  const e = Number(end);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
  return [s, e];
}

function trackUrl(stream: DashStream): string {
  return stream.baseUrl ?? stream.base_url ?? stream.backupUrl?.[0] ?? "";
}

function toTrack(stream: DashStream): DashTrack | null {
  const url = trackUrl(stream);
  const codecs = stream.codecs ?? "";
  const mimeType = stream.mimeType ?? stream.mime_type ?? "video/mp4";
  const mime = codecs ? `${mimeType}; codecs="${codecs}"` : mimeType;
  const init =
    parseRange(stream.segment_base?.initialization) ??
    parseRange(stream.segmentBase?.Initialization);
  const index =
    parseRange(stream.segment_base?.index_range) ??
    parseRange(stream.segmentBase?.indexRange);
  if (!url || !init) return null;
  return {
    url,
    mime,
    initStart: init[0],
    initEnd: init[1],
    mediaStart: index ? index[1] + 1 : init[1] + 1,
  };
}

function mediaSourceSupported(track: DashTrack): boolean {
  if (typeof MediaSource === "undefined") return false;
  try {
    return MediaSource.isTypeSupported(track.mime);
  } catch {
    return false;
  }
}

/** 从 DASH 清单里挑出当前清晰度的视频轨 + 最高码率音轨 */
function pickDash(
  data: PlayUrlResponse,
  qn: number,
): { video: DashTrack; audio: DashTrack } | null {
  const videos = data.dash?.video ?? [];
  const audios = data.dash?.audio ?? [];
  if (videos.length === 0 || audios.length === 0) return null;

  // 优先完全匹配，否则取不高于请求清晰度的最高档
  const exact = videos.find((item) => item.id === qn);
  const lower = videos
    .filter((item) => (item.id ?? 0) <= qn)
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
  const chosen = exact ?? lower ?? videos[0];

  const audioStream = [...audios].sort(
    (a, b) => (b.bandwidth ?? 0) - (a.bandwidth ?? 0),
  )[0];

  const video = toTrack(chosen);
  const audio = toTrack(audioStream);
  if (!video || !audio) return null;
  if (!mediaSourceSupported(video) || !mediaSourceSupported(audio)) return null;
  return { video, audio };
}

export function usePlayUrl(bvid: string, cid: number): PlayUrlState {
  const [state, setState] = useState(EMPTY);
  const runId = useRef(0);

  const load = useCallback(
    async (qn: number) => {
      if (!bvid || !cid) return;
      const id = runId.current + 1;
      runId.current = id;
      setState((prev) => ({ ...prev, status: "loading", error: "" }));

      try {
        const data = await client.request<PlayUrlResponse>(
          API.video.info.playurl,
          {
            params: {
              bvid,
              cid,
              qn,
              fnval: FNVAL_DASH,
              fourk: 1,
              platform: "pc",
              otype: "json",
            },
          },
        );
        if (id !== runId.current) return;

        const qualities = (data.support_formats ?? []).map((format) => ({
          quality: format.quality,
          label: format.new_description,
        }));
        const quality = data.quality ?? qn;

        const dash = pickDash(data, qn);
        if (dash) {
          setState({
            status: "ready",
            error: "",
            kind: "dash",
            source: "",
            downloadUrl: "",
            dash,
            qualities,
            quality,
          });
          // DASH 是音视频分轨，不能直接下载合轨文件；
          // 另取一次 fnval=1 的渐进式地址专门给下载用（失败不影响播放）
          void client
            .request<PlayUrlResponse>(API.video.info.playurl, {
              params: {
                bvid,
                cid,
                qn,
                fnval: FNVAL_PROGRESSIVE,
                fourk: 1,
                platform: "pc",
              },
            })
            .then((progressive) => {
              if (id !== runId.current) return;
              const url = progressive.durl?.[0]?.url ?? "";
              if (url) setState((prev) => ({ ...prev, downloadUrl: url }));
            })
            .catch(() => {
              /* 下载地址获取失败时隐藏下载按钮即可 */
            });
          return;
        }

        // DASH 不可用（旧视频 / 编码不支持）：退回渐进式 mp4
        const progressive = await client.request<PlayUrlResponse>(
          API.video.info.playurl,
          {
            params: {
              bvid,
              cid,
              qn,
              fnval: FNVAL_PROGRESSIVE,
              fourk: 1,
              platform: "pc",
            },
          },
        );
        if (id !== runId.current) return;
        const source = progressive.durl?.[0]?.url ?? "";
        if (!source) throw new Error("没有可用的播放地址");
        setState({
          status: "ready",
          error: "",
          kind: "progressive",
          source,
          downloadUrl: source,
          dash: null,
          qualities:
            qualities.length > 0
              ? qualities
              : (progressive.support_formats ?? []).map((format) => ({
                  quality: format.quality,
                  label: format.new_description,
                })),
          quality: progressive.quality ?? quality,
        });
      } catch (cause) {
        if (id !== runId.current) return;
        setState({
          status: "error",
          error: cause instanceof Error ? cause.message : String(cause),
          kind: "none",
          source: "",
          downloadUrl: "",
          dash: null,
          qualities: [],
          quality: 0,
        });
      }
    },
    [bvid, cid],
  );

  useEffect(() => {
    if (!bvid || !cid) {
      setState(EMPTY);
      return;
    }
    void load(PREFERRED_QUALITY);
  }, [bvid, cid, load]);

  const selectQuality = useCallback(
    (quality: number) => {
      void load(quality);
    },
    [load],
  );

  const retry = useCallback(() => {
    void load(state.quality || PREFERRED_QUALITY);
  }, [load, state.quality]);

  // DASH 是音视频分轨；下载统一走 fnval=1 的合轨 mp4（服务端最高给到 1080P）
  const resolveDownload = useCallback(
    async (quality: number) => {
      const data = await client.request<PlayUrlResponse>(API.video.info.playurl, {
        params: {
          bvid,
          cid,
          qn: quality,
          fnval: FNVAL_PROGRESSIVE,
          fourk: 1,
          platform: "pc",
        },
      });
      const url = data.durl?.[0]?.url ?? "";
      if (!url) throw new Error("没有可用的下载地址");
      return { url, quality: data.quality ?? quality };
    },
    [bvid, cid],
  );

  return { ...state, selectQuality, retry, resolveDownload };
}
