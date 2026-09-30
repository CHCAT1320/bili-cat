import { useCallback, useEffect, useRef, useState } from "react";
import {
  addVideoCoin,
  fetchFavoriteFolders,
  fetchVideoActions,
  setUserFollow,
  setVideoFavorite,
  setVideoLike,
  shareVideo,
  tripleVideo,
  type FavoriteFolderOption,
} from "../bilibili/videoActions";

export type VideoActionKind = "like" | "coin" | "favorite" | "follow" | "triple" | "share";

export interface UseVideoActionsOptions {
  aid: number;
  bvid: string;
  mid: number;
  loggedIn: boolean;
  like: number;
  coin: number;
  favorite: number;
}

export interface VideoActionsState {
  liked: boolean;
  coined: number;
  favored: boolean;
  followed: boolean;
  likeCount: number;
  coinCount: number;
  favCount: number;
  pending: VideoActionKind | "";
  error: string;
  folders: FavoriteFolderOption[];
  foldersLoading: boolean;
  toggleLike: () => Promise<void>;
  addCoin: (count: 1 | 2) => Promise<void>;
  toggleFollow: () => Promise<void>;
  loadFolders: () => Promise<void>;
  saveFavorites: (addIds: number[], delIds: number[]) => Promise<boolean>;
  triple: () => Promise<void>;
  share: () => Promise<void>;
}

export function useVideoActions({
  aid,
  bvid,
  mid,
  loggedIn,
  like,
  coin,
  favorite,
}: UseVideoActionsOptions): VideoActionsState {
  const [liked, setLiked] = useState(false);
  const [coined, setCoined] = useState(0);
  const [favored, setFavored] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [likeCount, setLikeCount] = useState(like);
  const [coinCount, setCoinCount] = useState(coin);
  const [favCount, setFavCount] = useState(favorite);
  const [pending, setPending] = useState<VideoActionKind | "">("");
  const [error, setError] = useState("");
  const [folders, setFolders] = useState<FavoriteFolderOption[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const runId = useRef(0);

  useEffect(() => {
    setLikeCount(like);
    setCoinCount(coin);
    setFavCount(favorite);
  }, [aid, like, coin, favorite]);

  useEffect(() => {
    if (!loggedIn || !aid) {
      setLiked(false);
      setCoined(0);
      setFavored(false);
      setFollowed(false);
      return;
    }
    const run = runId.current + 1;
    runId.current = run;
    void fetchVideoActions(aid, mid)
      .then((state) => {
        if (run !== runId.current) return;
        setLiked(state.liked);
        setCoined(state.coined);
        setFavored(state.favored);
        setFollowed(state.followed);
      })
      .catch(() => {
        /* 静默：部分接口对未登录/风控会失败，不影响观看 */
      });
  }, [aid, mid, loggedIn]);

  const guard = useCallback(
    async (kind: VideoActionKind, task: () => Promise<void>) => {
      if (pending) return;
      setPending(kind);
      setError("");
      try {
        await task();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setPending("");
      }
    },
    [pending],
  );

  const toggleLike = useCallback(
    () =>
      guard("like", async () => {
        const next = !liked;
        setLiked(next);
        setLikeCount((value) => value + (next ? 1 : -1));
        try {
          await setVideoLike(aid, bvid, next);
        } catch (cause) {
          setLiked(!next);
          setLikeCount((value) => value + (next ? -1 : 1));
          throw cause;
        }
      }),
    [aid, bvid, guard, liked],
  );

  const addCoin = useCallback(
    (count: 1 | 2) =>
      guard("coin", async () => {
        const remaining = 2 - coined;
        const actual = Math.min(count, remaining) as 1 | 2;
        if (actual <= 0) return;
        await addVideoCoin(aid, bvid, actual, !liked);
        setCoined((value) => value + actual);
        setCoinCount((value) => value + actual);
        if (!liked) {
          setLiked(true);
          setLikeCount((value) => value + 1);
        }
      }),
    [aid, bvid, coined, guard, liked],
  );

  const toggleFollow = useCallback(
    () =>
      guard("follow", async () => {
        const next = !followed;
        setFollowed(next);
        try {
          await setUserFollow(mid, next);
        } catch (cause) {
          setFollowed(!next);
          throw cause;
        }
      }),
    [followed, guard, mid],
  );

  const loadFolders = useCallback(async () => {
    if (!aid || !loggedIn) return;
    setFoldersLoading(true);
    try {
      setFolders(await fetchFavoriteFolders(aid, mid));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setFoldersLoading(false);
    }
  }, [aid, loggedIn, mid]);

  const saveFavorites = useCallback(
    async (addIds: number[], delIds: number[]) => {
      let ok = false;
      await guard("favorite", async () => {
        await setVideoFavorite(aid, addIds, delIds);
        const addedToAny = folders.some(
          (folder) => addIds.includes(folder.id) && !folder.selected,
        );
        const removedFromAll =
          delIds.length > 0 &&
          folders
            .filter((folder) => folder.selected && !delIds.includes(folder.id))
            .length === 0;
        if (addedToAny && !favored) {
          setFavored(true);
          setFavCount((value) => value + 1);
        } else if (removedFromAll && favored) {
          setFavored(false);
          setFavCount((value) => value - 1);
        }
        setFolders((prev) =>
          prev.map((folder) => {
            if (addIds.includes(folder.id)) return { ...folder, selected: true };
            if (delIds.includes(folder.id)) return { ...folder, selected: false };
            return folder;
          }),
        );
        ok = true;
      });
      return ok;
    },
    [aid, favored, folders, guard],
  );

  const triple = useCallback(
    () =>
      guard("triple", async () => {
        await tripleVideo(aid, bvid);
        if (!liked) {
          setLiked(true);
          setLikeCount((value) => value + 1);
        }
        if (coined < 2) {
          setCoinCount((value) => value + (2 - coined));
          setCoined(2);
        }
        if (!favored) {
          setFavored(true);
          setFavCount((value) => value + 1);
        }
      }),
    [aid, bvid, coined, favored, guard, liked],
  );

  const share = useCallback(
    () => guard("share", () => shareVideo(aid, bvid)),
    [aid, bvid, guard],
  );

  return {
    liked,
    coined,
    favored,
    followed,
    likeCount,
    coinCount,
    favCount,
    pending,
    error,
    folders,
    foldersLoading,
    toggleLike,
    addCoin,
    toggleFollow,
    loadFolders,
    saveFavorites,
    triple,
    share,
  };
}
