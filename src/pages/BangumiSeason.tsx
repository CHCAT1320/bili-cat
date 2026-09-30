import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { episodeLabel, episodeName, type BangumiEpisode } from "../bilibili/bangumi";
import { AppHeader } from "../components/AppHeader";
import { DownloadButton } from "../components/DownloadButton";
import { FeedError } from "../components/FeedError";
import { useBangumiPlayUrl, useBangumiSeason } from "../hooks/useBangumi";
import { formatCount } from "../utils/format";
import { streamUrl } from "../utils/stream";
import "./BangumiSeason.css";

function BangumiSeason() {
  const { t } = useTranslation();
  const { seasonId: rawId = "" } = useParams();
  const seasonId = Number(rawId);
  const { season, status, error, reload } = useBangumiSeason(seasonId);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [rawId]);

  // 正片 + 花絮拼成一个可播放列表，索引才能和选集按钮对上
  const allEpisodes = useMemo<BangumiEpisode[]>(
    () =>
      season
        ? [
            ...season.episodes,
            ...season.extras.flatMap((section) => section.episodes),
          ]
        : [],
    [season],
  );

  const episode = allEpisodes[index];
  const play = useBangumiPlayUrl(episode?.aid ?? 0, episode?.cid ?? 0);
  const src = streamUrl(play.source);

  return (
    <div className="bgmSeason">
      <AppHeader showBack />
      <div className="bgmSeasonBody">
        {status === "error" ? (
          <FeedError message={error} onRetry={reload} />
        ) : !season ? (
          <div className="statePanel">{t("main.loading")}</div>
        ) : (
          <>
            <section className="bgmHeader">
              <img
                className="bgmPoster"
                src={season.cover}
                alt=""
                referrerPolicy="no-referrer"
              />
              <div className="bgmHeaderText">
                <h1 className="bgmTitle">{season.title}</h1>
                {season.jpTitle ? (
                  <p className="bgmJpTitle">{season.jpTitle}</p>
                ) : null}
                <p className="bgmMeta">
                  {season.newEp ? <span>{season.newEp}</span> : null}
                  {season.total ? (
                    <span>
                      {t("bangumi.total")} {season.total}
                    </span>
                  ) : null}
                  {season.views ? (
                    <span>
                      {formatCount(season.views)} {t("video.view")}
                    </span>
                  ) : null}
                </p>
                {season.areas.length || season.styles.length ? (
                  <p className="bgmTags">
                    {[...season.areas, ...season.styles].map((tag) => (
                      <span key={tag} className="bgmTag">
                        {tag}
                      </span>
                    ))}
                  </p>
                ) : null}
                {season.evaluate ? (
                  <p className="bgmEvaluate">{season.evaluate}</p>
                ) : null}
              </div>
            </section>

            {episode ? (
              <section className="bgmPlayerWrap">
                <div className="bgmPlayer">
                  {src ? (
                    <video
                      className="bgmMedia"
                      src={src}
                      controls
                      preload="metadata"
                      playsInline
                    />
                  ) : (
                    <div className="bgmPlayerHint">
                      {play.status === "loading"
                        ? t("main.loading")
                        : play.error || t("bangumi.noPlay")}
                    </div>
                  )}
                </div>
                <div className="bgmPlayerBar">
                  <span className="bgmNowPlaying">
                    {episodeLabel(episode) || episode.title}
                  </span>
                  {play.qualities.length > 1 ? (
                    <span className="bgmQualities">
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
                  <DownloadButton
                    url={play.source}
                    fileName={`${season.title}-${episodeLabel(episode) || episode.title}`}
                  />
                </div>
              </section>
            ) : null}

            <h2 className="bgmSectionTitle">{t("bangumi.episodes")}</h2>
            <div className="bgmEpisodes">
              {season.episodes.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    itemIndex === index
                      ? "bgmEpisode bgmEpisodeActive"
                      : "bgmEpisode"
                  }
                  onClick={() => setIndex(itemIndex)}
                  title={episodeLabel(item)}
                >
                  <span className="bgmEpisodeIndex">{item.title}</span>
                  <span className="bgmEpisodeName">{episodeName(item)}</span>
                </button>
              ))}
            </div>

            {season.extras.map((section, sectionIndex) => {
              const offset =
                season.episodes.length +
                season.extras
                  .slice(0, sectionIndex)
                  .reduce((total, item) => total + item.episodes.length, 0);
              return (
                <section key={section.title} className="bgmExtras">
                  <h2 className="bgmSectionTitle">{section.title}</h2>
                  <div className="bgmEpisodes">
                    {section.episodes.map((item, itemIndex) => (
                      <button
                        key={item.id}
                        type="button"
                        className={
                          offset + itemIndex === index
                            ? "bgmEpisode bgmEpisodeActive"
                            : "bgmEpisode"
                        }
                        onClick={() => setIndex(offset + itemIndex)}
                      >
                        <span className="bgmEpisodeIndex">{item.title}</span>
                        <span className="bgmEpisodeName">{episodeName(item)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default BangumiSeason;
