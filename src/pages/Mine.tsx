import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import type { VideoCardData } from "../bilibili/feed";
import type { FavoriteFolder } from "../bilibili/userCenter";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedFooter } from "../components/FeedFooter";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { FolderCard } from "../components/FolderCard";
import { LoginDialog } from "../components/LoginDialog";
import { UserGrid } from "../components/UserGrid";
import { VideoGrid } from "../components/VideoGrid";
import { useAccount } from "../hooks/useAccount";
import {
  useFavoriteContent,
  useFavoriteFolders,
  useFollowings,
  useToview,
  useWatchHistory,
  type PagedList,
} from "../hooks/useUserCenter";
import "./Mine.css";

const TABS = ["favorite", "history", "toview", "following"] as const;

type Tab = (typeof TABS)[number];

function parseTab(value: string | null): Tab {
  return TABS.includes(value as Tab) ? (value as Tab) : "favorite";
}

function Mine() {
  const { t } = useTranslation();
  const [params, setSearchParams] = useSearchParams();
  const tab = parseTab(params.get("tab"));
  const account = useAccount();
  const [loginOpen, setLoginOpen] = useState(false);
  const [folder, setFolder] = useState<FavoriteFolder | null>(null);

  const loggedIn = Boolean(account.user?.isLogin);
  const mid = account.user?.mid ?? 0;

  const folders = useFavoriteFolders(mid, loggedIn && tab === "favorite");
  const content = useFavoriteContent(folder?.id ?? 0, Boolean(folder));
  const history = useWatchHistory(loggedIn && tab === "history");
  const toview = useToview(loggedIn && tab === "toview");
  const followings = useFollowings(mid, loggedIn && tab === "following");

  const renderVideos = (state: PagedList<VideoCardData>) =>
    state.status === "error" ? (
      <FeedError message={state.error} onRetry={state.retry} />
    ) : state.status === "loading" && state.items.length === 0 ? (
      <FeedSkeleton />
    ) : state.items.length === 0 ? (
      <div className="statePanel">{t("mine.empty")}</div>
    ) : (
      <>
        <VideoGrid items={state.items} />
        <FeedFooter
          hasMore={state.hasMore}
          loading={state.loadingMore}
          error={state.errorMore}
          onLoadMore={state.loadMore}
        />
      </>
    );

  return (
    <div className="mine">
      <AppHeader />
      <div className="mineBody">
        <div className="mineTabs">
          {TABS.map((value) => (
            <button
              key={value}
              type="button"
              className={value === tab ? "mineTab mineTabActive" : "mineTab"}
              onClick={() => {
                setFolder(null);
                const next = new URLSearchParams(params);
                if (value === "favorite") next.delete("tab");
                else next.set("tab", value);
                setSearchParams(next);
              }}
            >
              {t(`mine.${value}`)}
            </button>
          ))}
        </div>

        {!loggedIn ? (
          <div className="statePanel">
            <span>{t("mine.needLogin")}</span>
            <button
              type="button"
              className="appButton"
              onClick={() => setLoginOpen(true)}
            >
              {t("login.action")}
            </button>
          </div>
        ) : folder ? (
          <>
            <div className="mineFolderBar">
              <button
                type="button"
                className="appButton"
                onClick={() => setFolder(null)}
              >
                {t("mine.backToFolders")}
              </button>
              <span className="mineFolderName">{folder.title}</span>
            </div>
            {renderVideos(content)}
          </>
        ) : tab === "favorite" ? (
          folders.status === "error" ? (
            <FeedError message={folders.error} onRetry={folders.retry} />
          ) : folders.status === "loading" && folders.items.length === 0 ? (
            <FeedSkeleton />
          ) : folders.items.length === 0 ? (
            <div className="statePanel">{t("mine.empty")}</div>
          ) : (
            <div className="mineFolders">
              {folders.items.map((item) => (
                <FolderCard
                  key={item.id}
                  folder={item}
                  onClick={(value) => setFolder(value)}
                />
              ))}
            </div>
          )
        ) : tab === "history" ? (
          renderVideos(history)
        ) : tab === "toview" ? (
          renderVideos(toview)
        ) : followings.status === "error" ? (
          <FeedError message={followings.error} onRetry={followings.retry} />
        ) : followings.status === "loading" &&
          followings.items.length === 0 ? (
          <FeedSkeleton />
        ) : followings.items.length === 0 ? (
          <div className="statePanel">{t("mine.empty")}</div>
        ) : (
          <>
            <UserGrid users={followings.items} />
            <FeedFooter
              hasMore={followings.hasMore}
              loading={followings.loadingMore}
              error={followings.errorMore}
              onLoadMore={followings.loadMore}
            />
          </>
        )}
      </div>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

export default Mine;
