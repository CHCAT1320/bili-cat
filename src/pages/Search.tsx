import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedFooter } from "../components/FeedFooter";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { UserGrid } from "../components/UserGrid";
import { VideoGrid } from "../components/VideoGrid";
import { useUserSearch } from "../hooks/useUserSearch";
import { useVideoSearch } from "../hooks/useVideoSearch";
import {
  DEFAULT_DURATION,
  DEFAULT_ORDER,
  SEARCH_DURATIONS,
  SEARCH_ORDERS,
  parseDuration,
  parseOrder,
} from "../bilibili/search";
import "./Search.css";

const DURATION_KEYS = ["all", "short", "medium", "long", "veryLong"] as const;
const TYPES = ["video", "bili_user"] as const;

type SearchType = (typeof TYPES)[number];

function parseType(value: string | null): SearchType {
  return TYPES.includes(value as SearchType) ? (value as SearchType) : "video";
}

function Search() {
  const { t } = useTranslation();
  const [params, setSearchParams] = useSearchParams();
  const keyword = params.get("keyword") ?? "";
  const type = parseType(params.get("type"));
  const order = parseOrder(params.get("order"));
  const duration = parseDuration(params.get("duration"));

  const video = useVideoSearch(type === "video" ? keyword : "", order, duration);
  const user = useUserSearch(type === "bili_user" ? keyword : "");

  const update = (key: string, value: string, isDefault: boolean) => {
    const next = new URLSearchParams(params);
    if (isDefault) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  return (
    <div className="search">
      <AppHeader showBack />
      <div className="searchBody">
        <div className="searchFilters">
          <div className="searchFilterRow">
            <span className="searchFilterLabel">{t("search.typeLabel")}</span>
            {TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={
                  value === type
                    ? "searchFilter searchFilterActive"
                    : "searchFilter"
                }
                onClick={() => update("type", value, value === "video")}
              >
                {t(`search.type.${value}`)}
              </button>
            ))}
          </div>

          {type === "video" ? (
            <>
              <div className="searchFilterRow">
                <span className="searchFilterLabel">{t("search.sortLabel")}</span>
                {SEARCH_ORDERS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      value === order
                        ? "searchFilter searchFilterActive"
                        : "searchFilter"
                    }
                    onClick={() =>
                      update("order", value, value === DEFAULT_ORDER)
                    }
                  >
                    {t(`search.order.${value}`)}
                  </button>
                ))}
              </div>

              <div className="searchFilterRow">
                <span className="searchFilterLabel">
                  {t("search.durationLabel")}
                </span>
                {SEARCH_DURATIONS.map((value, index) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      value === duration
                        ? "searchFilter searchFilterActive"
                        : "searchFilter"
                    }
                    onClick={() =>
                      update("duration", String(value), value === DEFAULT_DURATION)
                    }
                  >
                    {t(`search.duration.${DURATION_KEYS[index]}`)}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {type === "bili_user" ? (
          user.status === "error" ? (
            <FeedError message={user.error} onRetry={user.retry} />
          ) : user.status === "loading" && user.users.length === 0 ? (
            <FeedSkeleton />
          ) : user.users.length === 0 ? (
            <div className="statePanel">{t("search.empty")}</div>
          ) : (
            <>
              <p className="searchSummary">
                {t("search.userResults", { count: user.total })}
              </p>
              <UserGrid users={user.users} />
              <FeedFooter
                hasMore={user.hasMore}
                loading={user.loadingMore}
                error={user.errorMore}
                onLoadMore={user.loadMore}
              />
            </>
          )
        ) : video.status === "error" ? (
          <FeedError message={video.error} onRetry={video.retry} />
        ) : video.status === "loading" && video.items.length === 0 ? (
          <FeedSkeleton />
        ) : video.items.length === 0 ? (
          <div className="statePanel">{t("search.empty")}</div>
        ) : (
          <>
            <p className="searchSummary">
              {t("search.results", { count: video.total })}
            </p>
            <VideoGrid items={video.items} />
            <FeedFooter
              hasMore={video.hasMore}
              loading={video.loadingMore}
              error={video.errorMore}
              onLoadMore={video.loadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Search;
