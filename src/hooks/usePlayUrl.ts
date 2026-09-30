import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import type { LoadStatus } from "./status";
/** fnval=1 取渐进式 mp4（音视频合轨，单个 <video> 可直接播放），无需 MSE */
const FNVAL_PROGRESSIVE = 1;
const PREFERRED_QUALITY = 80;

export interface PlayQuality {
  quality: number;
  label: string;
}

export interface PlayUrlState {
  status: LoadStatus;
  error: string;
  source: string;
  qualities: PlayQuality[];
  quality: number;
  selectQuality: (quality: number) => void;
  retry: () => void;
}

interface PlayUrlResponse {
  quality?: number;
  accept_quality?: number[];
  support_formats?: Array<{ quality: number; new_description: string }>;
  durl?: Array<{ url: string }>;
}

const EMPTY: Omit<PlayUrlState, "selectQuality" | "retry"> = {
  status: "loading",
  error: "",
  source: "",
  qualities: [],
  quality: 0,
};

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
              fnval: FNVAL_PROGRESSIVE,
              fourk: 1,
              platform: "pc",
            },
          },
        );
        if (id !== runId.current) return;
        const source = data.durl?.[0]?.url ?? "";
        if (!source) throw new Error("没有可用的播放地址");
        setState({
          status: "ready",
          error: "",
          source,
          qualities: (data.support_formats ?? []).map((format) => ({
            quality: format.quality,
            label: format.new_description,
          })),
          quality: data.quality ?? qn,
        });
      } catch (cause) {
        if (id !== runId.current) return;
        setState({
          status: "error",
          error: cause instanceof Error ? cause.message : String(cause),
          source: "",
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

  return { ...state, selectQuality, retry };
}
