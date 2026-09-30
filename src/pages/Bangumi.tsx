import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { coverUrl } from "../bilibili/feed";
import { weekdayKey } from "../bilibili/bangumi";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { useBangumiTimeline } from "../hooks/useBangumi";
import "./Bangumi.css";

function Bangumi() {
  const { t } = useTranslation();
  const { days, status, error, reload } = useBangumiTimeline();

  return (
    <div className="bangumi">
      <AppHeader />
      <div className="bangumiBody">
        {status === "error" ? (
          <FeedError message={error} onRetry={reload} />
        ) : status === "loading" && days.length === 0 ? (
          <FeedSkeleton />
        ) : (
          days.map((day) => (
            <section key={day.date} className="bangumiDay">
              <h2 className="bangumiDayTitle">
                {t(`bangumi.weekday.${weekdayKey(day.day_of_week)}`)}
                <span className="bangumiDate">{day.date}</span>
                {day.is_today ? (
                  <span className="bangumiToday">{t("bangumi.today")}</span>
                ) : null}
              </h2>

              <div className="bangumiList">
                {(day.episodes ?? []).map((episode) => (
                  <Link
                    key={episode.episode_id}
                    className="bangumiItem"
                    to={`/bangumi/${episode.season_id}`}
                  >
                    <img
                      className="bangumiCover"
                      src={coverUrl(episode.cover)}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <span className="bangumiItemText">
                      <span className="bangumiItemTitle">{episode.title}</span>
                      <span className="bangumiItemMeta">
                        {episode.pub_index}
                        {episode.pub_time ? ` · ${episode.pub_time}` : ""}
                        {episode.delay
                          ? ` · ${t("bangumi.delayed")}${episode.delay_reason ? `(${episode.delay_reason})` : ""}`
                          : ""}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export default Bangumi;
