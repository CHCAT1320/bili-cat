import { useCallback, useEffect, useRef, useState } from "react";
import { API, client } from "../bilibili";
import { coverUrl } from "../bilibili/feed";
import type { UserProfile } from "../bilibili/users";
import type { LoadStatus } from "./status";

interface AccInfo {
  mid: number;
  name: string;
  face?: string;
  sign?: string;
  level?: number;
}

interface RelationStat {
  follower?: number;
  following?: number;
}

export interface UserProfileState {
  profile: UserProfile | null;
  status: LoadStatus;
  error: string;
  reload: () => void;
}

export function useUserProfile(mid: number): UserProfileState {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const runId = useRef(0);

  const load = useCallback(() => {
    if (!mid) {
      setError("缺少 mid");
      setStatus("error");
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    setStatus("loading");
    setError("");

    void Promise.all([
      client.request<AccInfo>(API.user.info.info, { params: { mid } }),
      client
        .request<RelationStat>(API.user.info.relation_stat, {
          params: { vmid: mid },
        })
        .catch(() => ({}) as RelationStat),
    ])
      .then(([info, relation]) => {
        if (run !== runId.current) return;
        setProfile({
          mid: info.mid,
          name: info.name,
          face: coverUrl(info.face ?? ""),
          sign: info.sign?.trim() || undefined,
          level: info.level,
          fans: relation.follower,
          following: relation.following,
        });
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (run !== runId.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus("error");
      });
  }, [mid]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, status, error, reload: load };
}
