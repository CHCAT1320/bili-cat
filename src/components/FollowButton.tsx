import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { API, client } from "../bilibili";
import { setUserFollow } from "../bilibili/videoActions";
import "./FollowButton.css";

interface FollowButtonProps {
  mid: number;
  loggedIn: boolean;
  onRequireLogin: () => void;
}

export function FollowButton({ mid, loggedIn, onRequireLogin }: FollowButtonProps) {
  const { t } = useTranslation();
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loggedIn || !mid) {
      setFollowed(false);
      return;
    }
    let alive = true;
    client
      .request<{ relation?: { attribute?: number } }>(API.user.info.relation, {
        params: { mid },
      })
      .then((data) => {
        if (!alive) return;
        const attribute = data.relation?.attribute ?? 0;
        setFollowed(attribute === 2 || attribute === 6);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [mid, loggedIn]);

  const toggle = async () => {
    if (!loggedIn) {
      onRequireLogin();
      return;
    }
    if (busy || !mid) return;
    const next = !followed;
    setBusy(true);
    setFollowed(next);
    try {
      await setUserFollow(mid, next);
    } catch {
      setFollowed(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={followed ? "appButton followButton followButtonActive" : "appButton followButton"}
      onClick={() => void toggle()}
      disabled={busy}
    >
      {followed ? t("video.actFollowing") : t("video.actFollow")}
    </button>
  );
}
