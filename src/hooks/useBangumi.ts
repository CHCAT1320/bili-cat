import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import {
  toSeason,
  type BangumiSeason,
  type RawSeason,
  type TimelineDay,
} from "../bilibili/bangumi";
import type { LoadStatus } from "./status";

/** 番剧时间表：一次返回周一到周日 7 天 */
export function useBangumiTimeline() {
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const runId = useRef(0);

  const load = useCallback(() => {
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");

    void client
      .request<TimelineDay[]>(API.bangumi.info.timeline, {
        params: { types: 1 },
      })
      .then((data) => {
        if (run !== runId.current) return;
        setDays(Array.isArray(data) ? data : []);
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { days, status, error, reload: load };
}

interface SeasonResponse {
  main_section?: { episodes?: unknown[] };
  section?: Array<{ title?: string; episodes?: unknown[] }>;
}

export function useBangumiSeason(seasonId: number) {
  const [season, setSeason] = useState<BangumiSeason | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const runId = useRef(0);

  const load = useCallback(() => {
    if (!seasonId) {
      setError("缺少 season_id");
      setStatus("error");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");

    void Promise.all([
      client.request<RawSeason>(API.bangumi.info.collective_info, {
        params: { season_id: seasonId },
      }),
      client.request<SeasonResponse>(API.bangumi.info.episodes_list, {
        params: { season_id: seasonId },
      }),
    ])
      .then(([info, sections]) => {
        if (run !== runId.current) return;
        setSeason(
          toSeason(
            info,
            sections.main_section as never,
            sections.section as never,
          ),
        );
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [seasonId]);

  useEffect(() => {
    load();
  }, [load]);

  return { season, status, error, reload: load };
}

interface PlayUrlV2 {
  video_info?: {
    durl?: Array<{ url: string }>;
    accept_quality?: number[];
    support_formats?: Array<{ quality: number; new_description: string }>;
  };
  quality?: number;
}

export interface BangumiPlay {
  status: LoadStatus;
  error: string;
  source: string;
  quality: number;
  qualities: Array<{ quality: number; label: string }>;
  selectQuality: (quality: number) => void;
  retry: () => void;
}

/**
 * 番剧播放地址（pgc/player/web/v2/playurl）。
 * 只用 fnval=1 的渐进式 mp4：音视频合轨，单个 <video> 直接放，
 * 拿到的仍然是 *.bilivideo.com 直链，照样要走 Rust 代理。
 */
export function useBangumiPlayUrl(aid: number, cid: number): BangumiPlay {
  const [state, setState] = useState<{
    status: LoadStatus;
    error: string;
    source: string;
    quality: number;
    qualities: Array<{ quality: number; label: string }>;
  }>({ status: "loading", error: "", source: "", quality: 0, qualities: [] });
  const runId = useRef(0);

  const load = useCallback(
    async (qn: number) => {
      if (!aid || !cid) return;
      const run = runId.current + 1;
      runId.current = run;
      setState((prev) => ({ ...prev, status: "loading", error: "" }));

      try {
        const data = await client.request<PlayUrlV2>(
          API.bangumi.info.playurl,
          {
            params: { avid: aid, cid, qn, fnval: 1, fourk: 1, platform: "pc" },
          },
        );
        if (run !== runId.current) return;
        const source = data.video_info?.durl?.[0]?.url ?? "";
        if (!source) throw new Error("没有可用的播放地址（该集可能需要大会员）");
        setState({
          status: "ready",
          error: "",
          source,
          quality: data.quality ?? qn,
          qualities: (data.video_info?.support_formats ?? []).map((format) => ({
            quality: format.quality,
            label: format.new_description,
          })),
        });
      } catch (cause) {
        if (run !== runId.current) return;
        setState({
          status: "error",
          error: cause instanceof Error ? cause.message : String(cause),
          source: "",
          quality: 0,
          qualities: [],
        });
      }
    },
    [aid, cid],
  );

  useEffect(() => {
    if (!aid || !cid) {
      setState({ status: "loading", error: "", source: "", quality: 0, qualities: [] });
      return;
    }
    void load(80);
  }, [aid, cid, load]);

  return {
    ...state,
    selectQuality: (quality: number) => void load(quality),
    retry: () => void load(state.quality || 80),
  };
}
