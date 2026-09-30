import { useTranslation } from "react-i18next";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import "./FeedFooter.css";

interface FeedFooterProps {
  hasMore: boolean;
  loading: boolean;
  error: string;
  onLoadMore: () => void;
}

export function FeedFooter({
  hasMore,
  loading,
  error,
  onLoadMore,
}: FeedFooterProps) {
  const { t } = useTranslation();
  const sentinel = useInfiniteScroll(onLoadMore, hasMore && !loading && !error);

  if (error) {
    return (
      <div className="feedFooter">
        <button type="button" className="appButton" onClick={onLoadMore}>
          {t("main.retry")}
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="feedFooter">{t("main.loading")}</div>;
  }

  if (!hasMore) {
    return <div className="feedFooter">{t("main.noMore")}</div>;
  }

  return <div ref={sentinel} className="feedSentinel" aria-hidden="true" />;
}
