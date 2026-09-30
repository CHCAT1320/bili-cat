import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { languages } from "../i18n";
import "./Home.css";

function Home() {
  const { t, i18n } = useTranslation();

  return (
    <section className="home">
      <div className="homeCard">
        <h1 className="homeTitle">{t("home.title")}</h1>
        <p className="homeSubtitle">{t("home.subtitle")}</p>
        <p className="homeText">{t("home.text")}</p>
        <Link to="/main" className="homeLink">
          {t("home.cta")}
        </Link>
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
    </section>
  );
}

export default Home;
