import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { ReactNode } from "react";
import { languages } from "../i18n";
import {
  BiliCatLogo,
  IconComment,
  IconFolder,
  IconPlay,
  IconRepost,
  IconSend,
  IconStar,
} from "../components/icons";
import "./Home.css";

interface Feature {
  to: string;
  key: string;
  Icon: (props: { size?: number; className?: string }) => ReactNode;
}

const FEATURES: Feature[] = [
  { to: "/main", key: "recommend", Icon: IconPlay },
  { to: "/main", key: "player", Icon: IconStar },
  { to: "/main", key: "comments", Icon: IconComment },
  { to: "/dynamic", key: "dynamic", Icon: IconRepost },
  { to: "/message", key: "message", Icon: IconSend },
  { to: "/bangumi", key: "bangumi", Icon: IconFolder },
];

function Home() {
  const { t, i18n } = useTranslation();

  return (
    <section className="home">
      <div className="homeCard">
        <BiliCatLogo className="homeLogo" size={60} />
        <h1 className="homeTitle">{t("home.title")}</h1>
        <p className="homeSubtitle">{t("home.tagline")}</p>
        <p className="homeText">{t("home.text")}</p>

        <div className="homeActions">
          <Link to="/main" className="homeLink">
            {t("home.cta")}
          </Link>
          <Link to="/search" className="homeLink homeLinkGhost">
            {t("home.search")}
          </Link>
          <Link to="/mine" className="homeLink homeLinkGhost">
            {t("home.mine")}
          </Link>
        </div>

        <div className="homeLang" role="group" aria-label="Language">
          {languages.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              className={
                code === i18n.resolvedLanguage
                  ? "homeLangButton homeLangButtonActive"
                  : "homeLangButton"
              }
              aria-pressed={code === i18n.resolvedLanguage}
              onClick={() => void i18n.changeLanguage(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="homeFeatures">
        <h2 className="homeFeaturesTitle">{t("home.featuresTitle")}</h2>
        <div className="homeFeatureGrid">
          {FEATURES.map(({ to, key, Icon }) => (
            <Link key={key} to={to} className="homeFeature">
              <span className="homeFeatureIcon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="homeFeatureText">
                <span className="homeFeatureTitle">
                  {t(`home.feature.${key}.title`)}
                </span>
                <span className="homeFeatureDesc">
                  {t(`home.feature.${key}.desc`)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Home;
