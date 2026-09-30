import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { VideoCardData } from "../bilibili/feed";
import { formatCount } from "../utils/format";
import "./VideoCard.css";

interface VideoCardProps {
  video: VideoCardData;
}

export function VideoCard({ video }: VideoCardProps) {
  const { t } = useTranslation();

  return (
    <Link className="videoCard" to={`/video/${video.bvid}`}>
      <div className="videoCoverBox">
        {video.pic ? (
          <img
            className="videoCover"
            src={video.pic}
            alt={video.title}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
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
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="videoAvatar" />
        )}
        <span className="videoUpName">{video.upName}</span>
        <span className="videoView">
          {formatCount(video.view)} {t("main.views")}
        </span>
      </div>
    </Link>
  );
}
