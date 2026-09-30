import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { coverUrl } from "../bilibili/feed";
import { parseVideoId } from "../bilibili/videoId";
import { AppHeader } from "../components/AppHeader";
import { CommentSection } from "../components/CommentSection";
import { DanmakuLayer } from "../components/DanmakuLayer";
import { DashVideo } from "../components/DashVideo";
import { DownloadButton } from "../components/DownloadButton";
import { FeedError } from "../components/FeedError";
import { FollowButton } from "../components/FollowButton";
import { LoginDialog } from "../components/LoginDialog";
import { VideoActions } from "../components/VideoActions";
import { useAccount } from "../hooks/useAccount";
import { useDanmaku } from "../hooks/useDanmaku";
import { usePlayUrl } from "../hooks/usePlayUrl";
import { useVideoDetail } from "../hooks/useVideoDetail";
import { formatCount, formatDuration } from "../utils/format";
import { streamUrl } from "../utils/stream";
import "./Video.css";

function Video() {
  const { t } = useTranslation();
  const { id: rawId = "" } = useParams();
  const videoId = useMemo(() => parseVideoId(rawId), [rawId]);
  const { video, status, error, reload } = useVideoDetail(videoId);
  const [page, setPage] = useState(1);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [autoMuted, setAutoMuted] = useState(false);
  const part = video?.pages?.find((item) => item.page === page);
  const cid = part?.cid ?? video?.cid ?? 0;
  const play = usePlayUrl(video?.bvid ?? "", cid);
  const danmaku = useDanmaku(cid);
  const account = useAccount();
  const [loginOpen, setLoginOpen] = useState(false);
  const loggedIn = Boolean(account.user?.isLogin);
  const src = streamUrl(play.source);
  const startedRef = useRef("");

  useEffect(() => {
    setPage(1);
  }, [rawId]);

  // 自动开播：带声音被自动播放策略拦下时，降级为静音并提示取消静音
  useEffect(() => {
    const node = videoEl;
    if (!node || !src || startedRef.current === src) return;
    startedRef.current = src;
    const attempt = node.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {
        node.muted = true;
        setAutoMuted(true);
        void node.play().catch(() => {});
      });
    }
  }, [src, videoEl]);

  const embedUrl = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(video?.bvid ?? "")}&p=${page}&autoplay=1&danmaku=0&high_quality=1`;

  const stats = video
    ? [
        { label: t("video.view"), value: formatCount(video.stat?.view) },
        { label: t("video.danmaku"), value: formatCount(video.stat?.danmaku) },
        { label: t("video.like"), value: formatCount(video.stat?.like) },
        { label: t("video.coin"), value: formatCount(video.stat?.coin) },
        { label: t("video.favorite"), value: formatCount(video.stat?.favorite) },
        { label: t("video.share"), value: formatCount(video.stat?.share) },
        { label: t("video.reply"), value: formatCount(video.stat?.reply) },
      ]
    : [];

  return (
    <div className="video">
      <AppHeader showBack />
      <div className="videoBody">
        {status === "error" ? (
          <FeedError message={error} onRetry={reload} />
        ) : !video ? (
          <div className="statePanel">{t("main.loading")}</div>
        ) : (
          <>
            <div className="videoPlayer">
              {play.kind === "dash" && play.dash ? (
                <>
                  <DashVideo
                    video={play.dash.video}
                    audio={play.dash.audio}
                    onElement={setVideoEl}
                    onAutoMuted={() => setAutoMuted(true)}
                  />
                  <DanmakuLayer
                    items={danmaku.items}
                    video={videoEl}
                    enabled={danmaku.enabled}
                  />
                  {autoMuted ? (
                    <button
                      type="button"
                      className="videoUnmute"
                      onClick={() => {
                        if (!videoEl) return;
                        videoEl.muted = false;
                        videoEl.volume = 1;
                        setAutoMuted(false);
                      }}
                    >
                      {t("video.unmute")}
                    </button>
                  ) : null}
                </>
              ) : src ? (
                <>
                  <video
                    ref={setVideoEl}
                    className="videoMedia"
                    src={src}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                  <DanmakuLayer
                    items={danmaku.items}
                    video={videoEl}
                    enabled={danmaku.enabled}
                  />
                  {autoMuted ? (
                    <button
                      type="button"
                      className="videoUnmute"
                      onClick={() => {
                        if (!videoEl) return;
                        videoEl.muted = false;
                        videoEl.volume = 1;
                        setAutoMuted(false);
                      }}
                    >
                      {t("video.unmute")}
                    </button>
                  ) : null}
                </>
              ) : (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <div className="videoControls">
              {play.qualities.length > 1 ? (
                <span className="videoQualities">
                  <span className="videoQualitiesLabel">
                    {t("video.quality")}
                  </span>
                  {play.qualities.map((item) => (
                    <button
                      key={item.quality}
                      type="button"
                      className={
                        item.quality === play.quality
                          ? "videoQuality videoQualityActive"
                          : "videoQuality"
                      }
                      onClick={() => play.selectQuality(item.quality)}
                    >
                      {item.label}
                    </button>
                  ))}
                </span>
              ) : null}

              <button
                type="button"
                className="appButton"
                onClick={danmaku.toggle}
                disabled={danmaku.items.length === 0}
                title={danmaku.error}
              >
                {danmaku.enabled ? t("danmaku.hide") : t("danmaku.show")}
                {danmaku.items.length > 0 ? ` · ${danmaku.items.length}` : ""}
              </button>
            </div>

            <h1 className="videoHeading">{video.title}</h1>

            <div className="videoByline">
              {video.owner?.face ? (
                <img
                  className="videoBylineAvatar"
                  src={coverUrl(video.owner.face)}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="videoBylineAvatar" />
              )}
              <div className="videoBylineText">
                <p className="videoBylineName">{video.owner?.name}</p>
                <p className="videoBylineDate">
                  {new Date(video.pubdate * 1000).toLocaleString()}
                </p>
              </div>
              {video.owner?.mid ? (
                <FollowButton
                  mid={video.owner.mid}
                  loggedIn={loggedIn}
                  onRequireLogin={() => setLoginOpen(true)}
                />
              ) : null}
              {video.owner?.mid ? (
                <Link className="appButton" to={`/space/${video.owner.mid}`}>
                  {t("video.upHome")}
                </Link>
              ) : null}
              <DownloadButton
                url={play.downloadUrl || play.source}
                fileName={video.title}
                qualities={play.qualities}
                quality={play.quality}
                resolve={play.resolveDownload}
              />
            </div>

            <ul className="videoStats">
              {stats.map((stat) => (
                <li key={stat.label}>
                  <span className="videoStatValue">{stat.value}</span>
                  <span className="videoStatLabel">{stat.label}</span>
                </li>
              ))}
            </ul>

            <VideoActions
              aid={video.aid}
              bvid={video.bvid}
              mid={video.owner?.mid ?? 0}
              loggedIn={loggedIn}
              like={video.stat?.like ?? 0}
              coin={video.stat?.coin ?? 0}
              favorite={video.stat?.favorite ?? 0}
              share={video.stat?.share ?? 0}
              onRequireLogin={() => setLoginOpen(true)}
            />

            {video.desc ? (
              <section className="videoSection">
                <h2 className="videoSectionTitle">{t("video.desc")}</h2>
                <p className="videoDesc">{video.desc}</p>
              </section>
            ) : null}

            {video.pages.length > 1 ? (
              <section className="videoSection">
                <h2 className="videoSectionTitle">{t("video.parts")}</h2>
                <ol className="videoParts">
                  {video.pages.map((item) => (
                    <li key={item.cid}>
                      <button
                        type="button"
                        className={
                          item.page === page
                            ? "videoPart videoPartActive"
                            : "videoPart"
                        }
                        onClick={() => setPage(item.page)}
                      >
                        <span className="videoPartName">
                          {item.page}. {item.part}
                        </span>
                        <span className="videoPartTime">
                          {formatDuration(item.duration)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <CommentSection aid={video.aid} />
          </>
        )}
      </div>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default Video;
