import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedFooter } from "../components/FeedFooter";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { VideoGrid } from "../components/VideoGrid";
import { RANK_TABS, useRankFeed, type RankTab } from "../hooks/useRankFeed";
import "./Rank.css";

function parseTab(value: string | null): RankTab {
  return RANK_TABS.includes(value as RankTab) ? (value as RankTab) : "popular";
}

function Rank() {
  const { t } = useTranslation();
  const [params, setSearchParams] = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const feed = useRankFeed(tab);

  return (
    <div className="rank">
      <AppHeader />
      <div className="rankBody">
        <div className="rankTabs">
          {RANK_TABS.map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === tab ? "rankTab rankTabActive" : "rankTab"
              }
              onClick={() => {
                const next = new URLSearchParams(params);
                if (value === "popular") next.delete("tab");
                else next.set("tab", value);
                setSearchParams(next);
              }}
            >
              {t(`rank.${value}`)}
            </button>
          ))}
        </div>

        {feed.status === "error" ? (
          <FeedError message={feed.error} onRetry={feed.retry} />
        ) : feed.status === "loading" && feed.items.length === 0 ? (
          <FeedSkeleton />
        ) : (
          <>
            <VideoGrid items={feed.items} />
            <FeedFooter
              hasMore={feed.hasMore}
              loading={feed.loadingMore}
              error={feed.errorMore}
              onLoadMore={feed.loadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Rank;
