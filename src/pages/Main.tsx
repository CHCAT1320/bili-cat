import { useRef } from "react";
import { AppHeader } from "../components/AppHeader";
import { FeedError } from "../components/FeedError";
import { FeedFooter } from "../components/FeedFooter";
import { FeedSkeleton } from "../components/FeedSkeleton";
import { VideoGrid } from "../components/VideoGrid";
import { useHomeFeed } from "../hooks/useHomeFeed";
import { useScrollAnchor } from "../hooks/useScrollAnchor";
import "./Main.css";

function Main() {
  const {
    items,
    status,
    error,
    errorMore,
    hasMore,
    loadingMore,
    generation,
    refresh,
    loadMore,
  } = useHomeFeed();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const lastItem = items[items.length - 1];

  useScrollAnchor(gridRef, generation, lastItem?.bvid, items.length);

  return (
    <div className="main">
      <AppHeader
        busy={status === "loading"}
        onRefresh={refresh}
        showBack={false}
      />
      <div className="mainBody">
        {status === "error" ? (
          <FeedError message={error} onRetry={refresh} />
        ) : status === "loading" && items.length === 0 ? (
          <FeedSkeleton />
        ) : (
          <>
            <VideoGrid ref={gridRef} items={items} />
            <FeedFooter
              hasMore={hasMore}
              loading={loadingMore}
              error={errorMore}
              onLoadMore={loadMore}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default Main;
