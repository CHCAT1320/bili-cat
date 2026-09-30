import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import type { VideoCardData } from "../bilibili/feed";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedFooter } from "../components/FeedFooter";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { VideoGrid } from "../components/VideoGrid";
import { useScrollAnchor } from "../hooks/useScrollAnchor";
import { useUserProfile } from "../hooks/useUserProfile";
import { useUserVideos } from "../hooks/useUserVideos";
import { formatCount } from "../utils/format";
import "./Space.css";

function Space() {
  const { t } = useTranslation();
  const { mid: midParam = "" } = useParams();
  const mid = Number(midParam);
  const profile = useUserProfile(mid);
  const list = useUserVideos(mid);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const cards = useMemo<VideoCardData[]>(
    () =>
      list.videos.map((video) => ({
        bvid: video.bvid,
        title: video.title,
        pic: video.pic,
        duration: /^\d+:\d+$/.test(video.duration ?? "")
          ? video.duration
          : undefined,
        upName: profile.profile?.name,
        upFace: profile.profile?.face,
        view: Number(video.play ?? 0) || undefined,
      })),
    [list.videos, profile.profile],
  );

  const lastCard = cards[cards.length - 1];
  useScrollAnchor(gridRef, 0, lastCard?.bvid, cards.length);

  return (
    <div className="space">
      <AppHeader showBack />
      <div className="spaceBody">
        {profile.status === "error" ? (
          <FeedError message={profile.error} onRetry={profile.reload} />
        ) : profile.profile ? (
          <section className="spaceProfile">
            {profile.profile.face ? (
              <img
                className="spaceAvatar"
                src={profile.profile.face}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="spaceAvatar" />
            )}
            <div className="spaceProfileText">
              <h1 className="spaceName">
                {profile.profile.name}
                {profile.profile.level ? (
                  <span className="spaceLevel">LV{profile.profile.level}</span>
                ) : null}
              </h1>
              <p className="spaceStats">
                {formatCount(profile.profile.fans)} {t("space.fans")} ·{" "}
                {formatCount(profile.profile.following)} {t("space.following")}
              </p>
              {profile.profile.sign ? (
                <p className="spaceSign">{profile.profile.sign}</p>
              ) : null}
            </div>
          </section>
        ) : (
          <div className="statePanel">{t("main.loading")}</div>
        )}

        <h2 className="spaceSectionTitle">{t("space.videos")}</h2>

        {list.status === "error" ? (
          <FeedError message={list.error} onRetry={list.retry} />
        ) : list.status === "loading" && cards.length === 0 ? (
          <FeedSkeleton />
        ) : cards.length === 0 ? (
          <div className="statePanel">{t("space.empty")}</div>
        ) : (
          <>
            <VideoGrid ref={gridRef} items={cards} />
            <FeedFooter
              hasMore={list.hasMore}
              loading={list.loadingMore}
              error={list.errorMore}
              onLoadMore={list.loadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Space;
