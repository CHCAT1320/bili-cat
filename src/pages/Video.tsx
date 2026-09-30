import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { coverUrl } from "../bilibili/feed";
import { parseVideoId } from "../bilibili/videoId";
import { AppHeader } from "../components/AppHeader";
import { DownloadButton } from "../components/DownloadButton";
import { FeedError } from "../components/FeedError";
import { usePlayUrl } from "../hooks/usePlayUrl";
import { useVideoDetail } from "../hooks/useVideoDetail";
import { openExternal } from "../utils/external";
import { formatCount, formatDuration } from "../utils/format";
import { streamUrl } from "../utils/stream";
import "./Video.css";

const WEB_URL = "https://www.bilibili.com/video/";

function Video() {
  const { t } = useTranslation();
  const { id: rawId = "" } = useParams();
  const videoId = useMemo(() => parseVideoId(rawId), [rawId]);
  const { video, status, error, reload } = useVideoDetail(videoId);
  const [page, setPage] = useState(1);
  const part = video?.pages?.find((item) => item.page === page);
  const cid = part?.cid ?? video?.cid ?? 0;
  const play = usePlayUrl(video?.bvid ?? "", cid);
  const src = streamUrl(play.source);

  useEffect(() => {
    setPage(1);
  }, [rawId]);

  const embedUrl = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(video?.bvid ?? "")}&p=${page}&autoplay=0&danmaku=0&high_quality=1`;

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
              {src ? (
                <video
                  className="videoMedia"
                  src={src}
                  controls
                  preload="metadata"
                  playsInline
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            {play.qualities.length > 1 ? (
              <div className="videoQualities">
                <span className="videoQualitiesLabel">{t("video.quality")}</span>
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
              </div>
            ) : null}

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
                <Link className="appButton" to={`/space/${video.owner.mid}`}>
                  {t("video.upHome")}
                </Link>
              ) : null}
              <button
                type="button"
                className="appButton"
                onClick={() => openExternal(`${WEB_URL}${video.bvid}`)}
              >
                {t("video.openExternal")}
              </button>
              <DownloadButton
                url={play.source}
                fileName={`${video.title}-${play.quality}p`}
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
          </>
        )}
      </div>
    </div>
  );
}

export default Video;
