import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { VideoCardData } from "../bilibili/feed";
import { formatCount, formatRelativeTime } from "../utils/format";
import { IconComment, IconPlay } from "./icons";
import "./VideoCard.css";

interface VideoCardProps {
  video: VideoCardData;
}

export function VideoCard({ video }: VideoCardProps) {
  const { t } = useTranslation();
  const time = formatRelativeTime(video.pubDate);

  return (
    <Link className="videoCard" to={`/video/${video.bvid}`}>
      <div className="videoCoverBox">
        {video.pic ? (
          <img
            className="videoCover"
            src={video.pic}
            alt={video.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : null}
        {video.reason ? (
          <span className="videoReason" title={video.reason}>
            {video.reason}
          </span>
        ) : null}
        {video.duration ? (
          <span className="videoDuration">{video.duration}</span>
        ) : null}
      </div>

      <p className="videoTitle">
        {video.titleParts
          ? video.titleParts.map((part, index) =>
              part.highlight ? (
                <mark key={index} className="videoTitleHit">
                  {part.text}
                </mark>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )
          : video.title}
      </p>

      <div className="videoMeta">
        {video.upFace ? (
          <img
            className="videoAvatar"
            src={video.upFace}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="videoAvatar" />
        )}
        <span className="videoUpName">{video.upName}</span>
      </div>

      <div className="videoStats">
        <span className="videoStat" title={t("main.views")}>
          <IconPlay size={13} />
          {formatCount(video.view)}
        </span>
        {video.danmaku ? (
          <span className="videoStat" title={t("main.danmaku")}>
            <IconComment size={13} />
            {formatCount(video.danmaku)}
          </span>
        ) : null}
        {time ? <span className="videoStat videoStatTime">{time}</span> : null}
      </div>
    </Link>
  );
}
