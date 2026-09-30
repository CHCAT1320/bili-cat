import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useVideoActions } from "../hooks/useVideoActions";
import { formatCount } from "../utils/format";
import {
  IconCoin,
  IconLike,
  IconShare,
  IconStar,
  IconTriple,
} from "./icons";
import "./VideoActions.css";

interface VideoActionsProps {
  aid: number;
  bvid: string;
  mid: number;
  loggedIn: boolean;
  like: number;
  coin: number;
  favorite: number;
  share: number;
  onRequireLogin: () => void;
}

export function VideoActions({
  aid,
  bvid,
  mid,
  loggedIn,
  like,
  coin,
  favorite,
  share,
  onRequireLogin,
}: VideoActionsProps) {
  const { t } = useTranslation();
  const actions = useVideoActions({
    aid,
    bvid,
    mid,
    loggedIn,
    like,
    coin,
    favorite,
  });
  const [coinMenu, setCoinMenu] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [selection, setSelection] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!favOpen) return;
    const map: Record<number, boolean> = {};
    for (const folder of actions.folders) map[folder.id] = folder.selected;
    setSelection(map);
  }, [favOpen, actions.folders]);

  const requireLogin = () => {
    if (!loggedIn) {
      onRequireLogin();
      return true;
    }
    return false;
  };

  const openFavorites = async () => {
    if (requireLogin()) return;
    setFavOpen(true);
    await actions.loadFolders();
  };

  const saveFavorites = async () => {
    const addIds: number[] = [];
    const delIds: number[] = [];
    for (const folder of actions.folders) {
      const want = selection[folder.id] ?? false;
      if (want && !folder.selected) addIds.push(folder.id);
      if (!want && folder.selected) delIds.push(folder.id);
    }
    if (addIds.length === 0 && delIds.length === 0) {
      setFavOpen(false);
      return;
    }
    const ok = await actions.saveFavorites(addIds, delIds);
    if (ok) setFavOpen(false);
  };

  return (
    <div className="videoActions">
      <button
        type="button"
        className={actions.liked ? "videoAction videoActionActive" : "videoAction"}
        onClick={() => {
          if (requireLogin()) return;
          void actions.toggleLike();
        }}
        disabled={actions.pending !== ""}
      >
        <IconLike className="videoActionIcon" />
        <span>{formatCount(actions.likeCount)}</span>
        <span className="videoActionLabel">
          {actions.liked ? t("video.actLiked") : t("video.actLike")}
        </span>
      </button>

      <div className="videoActionCoin">
        <button
          type="button"
          className={actions.coined > 0 ? "videoAction videoActionActive" : "videoAction"}
          onClick={() => {
            if (requireLogin()) return;
            setCoinMenu((value) => !value);
          }}
          disabled={actions.pending !== "" || actions.coined >= 2}
          aria-expanded={coinMenu}
        >
          <IconCoin className="videoActionIcon" />
          <span>{formatCount(actions.coinCount)}</span>
          <span className="videoActionLabel">{t("video.actCoin")}</span>
        </button>
        {coinMenu ? (
          <div className="videoCoinMenu">
            {([1, 2] as const).map((count) => (
              <button
                key={count}
                type="button"
                className="videoCoinOption"
                disabled={actions.coined + count > 2}
                onClick={() => {
                  setCoinMenu(false);
                  void actions.addCoin(count);
                }}
              >
                {t("video.actCoinCount", { count })}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={actions.favored ? "videoAction videoActionActive" : "videoAction"}
        onClick={() => void openFavorites()}
        disabled={actions.pending !== ""}
      >
        <IconStar className="videoActionIcon" />
        <span>{formatCount(actions.favCount)}</span>
        <span className="videoActionLabel">{t("video.actFavorite")}</span>
      </button>

      <button
        type="button"
        className="videoAction"
        onClick={() => {
          if (requireLogin()) return;
          void actions.triple();
        }}
        disabled={actions.pending !== ""}
        title={t("video.actTripleHint")}
      >
        <IconTriple className="videoActionIcon" />
        <span className="videoActionLabel">{t("video.actTriple")}</span>
      </button>

      <button
        type="button"
        className="videoAction"
        onClick={() => void actions.share()}
        disabled={actions.pending !== ""}
      >
        <IconShare className="videoActionIcon" />
        <span>{formatCount(share)}</span>
        <span className="videoActionLabel">{t("video.share")}</span>
      </button>

      {actions.error ? <span className="videoActionError">{actions.error}</span> : null}

      {favOpen
        ? createPortal(
            <div
              className="favMask"
              role="dialog"
              aria-modal="true"
              aria-label={t("video.favTitle")}
              onClick={() => setFavOpen(false)}
            >
              <div className="favPanel" onClick={(event) => event.stopPropagation()}>
                <div className="favHead">
                  <h3 className="favTitle">{t("video.favTitle")}</h3>
                  <button
                    type="button"
                    className="favClose"
                    onClick={() => setFavOpen(false)}
                    aria-label={t("login.close")}
                  >
                    ×
                  </button>
                </div>
                {actions.foldersLoading ? (
                  <p className="favHint">{t("main.loading")}</p>
                ) : actions.folders.length === 0 ? (
                  <p className="favHint">{t("video.favEmpty")}</p>
                ) : (
                  <ul className="favList">
                    {actions.folders.map((folder) => (
                      <li key={folder.id}>
                        <label className="favItem">
                          <input
                            type="checkbox"
                            checked={selection[folder.id] ?? false}
                            onChange={(event) =>
                              setSelection((prev) => ({
                                ...prev,
                                [folder.id]: event.target.checked,
                              }))
                            }
                          />
                          <span className="favItemTitle">{folder.title}</span>
                          <span className="favItemCount">{folder.count}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="favFoot">
                  <button
                    type="button"
                    className="appButton"
                    onClick={() => setFavOpen(false)}
                  >
                    {t("comment.cancel")}
                  </button>
                  <button
                    type="button"
                    className="appButton"
                    onClick={() => void saveFavorites()}
                    disabled={actions.pending !== ""}
                  >
                    {t("video.favSave")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
