import { useTranslation } from "react-i18next";
import "./FeedError.css";

interface FeedErrorProps {
  message: string;
  onRetry: () => void;
}

export function FeedError({ message, onRetry }: FeedErrorProps) {
  const { t } = useTranslation();

  return (
    <div className="statePanel">
      <span>{t("main.error")}</span>
      <span className="statePanelDetail">{message}</span>
      <button type="button" className="appButton" onClick={onRetry}>
        {t("main.retry")}
      </button>
    </div>
  );
}
