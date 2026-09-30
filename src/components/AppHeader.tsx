import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router";
import { logout } from "../bilibili/account";
import { parseVideoId, videoIdKey } from "../bilibili/videoId";
import { useAccount } from "../hooks/useAccount";
import { useSearchSuggest } from "../hooks/useSearchSuggest";
import { LoginDialog } from "./LoginDialog";
import "./AppHeader.css";

interface AppHeaderProps {
  busy?: boolean;
  onRefresh?: () => void;
  showBack?: boolean;
}

const LIST_ID = "appSearchSuggest";

export function AppHeader({ busy, onRefresh, showBack }: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlKeyword = params.get("keyword") ?? "";
  const [keyword, setKeyword] = useState(urlKeyword);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestions = useSearchSuggest(keyword, open);
  const account = useAccount();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = Boolean(account.user?.isLogin);

  useEffect(() => {
    setKeyword(urlKeyword);
  }, [urlKeyword]);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const go = (value: string) => {
    const term = value.trim();
    if (!term) return;
    close();
    setKeyword(term);
    inputRef.current?.blur();

    // 直接粘贴 BV 号 / av 号 / 视频链接时跳过搜索页
    const videoId = parseVideoId(term);
    if (videoId) {
      navigate(`/video/${videoIdKey(videoId)}`);
      return;
    }
    navigate(`/search?keyword=${encodeURIComponent(term)}`);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    go(activeIndex >= 0 ? (suggestions[activeIndex] ?? keyword) : keyword);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
    }
  };

  const expanded = open && suggestions.length > 0;

  return (
    <header className="appHeader">
      <Link className="appLogo" to="/main">
        bili-cat
      </Link>

      <nav className="appNav">
        <NavLink
          className={({ isActive }) =>
            isActive ? "appNavLink appNavLinkActive" : "appNavLink"
          }
          to="/main"
        >
          {t("nav.home")}
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            isActive ? "appNavLink appNavLinkActive" : "appNavLink"
          }
          to="/rank"
        >
          {t("nav.rank")}
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            isActive ? "appNavLink appNavLinkActive" : "appNavLink"
          }
          to="/bangumi"
        >
          {t("nav.bangumi")}
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            isActive ? "appNavLink appNavLinkActive" : "appNavLink"
          }
          to="/mine"
        >
          {t("nav.mine")}
        </NavLink>
      </nav>

      <form className="appSearch" role="search" onSubmit={submit}>
        <div className="appSearchBox">
          <input
            ref={inputRef}
            className="appSearchInput"
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => close()}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            aria-autocomplete="list"
            aria-controls={LIST_ID}
            aria-expanded={expanded}
            aria-activedescendant={
              activeIndex >= 0 ? `${LIST_ID}-${activeIndex}` : undefined
            }
          />

          {expanded ? (
            <ul
              className="appSuggest"
              id={LIST_ID}
              role="listbox"
              aria-label={t("search.suggestions")}
              onMouseDown={(event) => event.preventDefault()}
            >
              {suggestions.map((item, index) => (
                <li
                  key={item}
                  id={`${LIST_ID}-${index}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={
                    index === activeIndex
                      ? "appSuggestItem appSuggestItemActive"
                      : "appSuggestItem"
                  }
                  onClick={() => go(item)}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button className="appSearchButton" type="submit">
          {t("search.action")}
        </button>
      </form>

      <div className="appActions">
        {showBack ? (
          <button
            type="button"
            className="appButton"
            onClick={() => navigate(-1)}
          >
            {t("common.back")}
          </button>
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            className="appButton"
            onClick={onRefresh}
            disabled={busy}
          >
            {busy ? t("main.loading") : t("main.refresh")}
          </button>
        ) : null}

        {loggedIn ? (
          <div className="appAccount">
            <button
              type="button"
              className="appAccountButton"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
            >
              {account.user?.face ? (
                <img
                  className="appAccountAvatar"
                  src={account.user.face}
                  alt=""
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="appAccountAvatar" />
              )}
              <span className="appAccountName">{account.user?.uname}</span>
            </button>
            {menuOpen ? (
              <div className="appAccountMenu">
                <button
                  type="button"
                  className="appAccountMenuItem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                >
                  {t("login.logout")}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="appButton"
            onClick={() => setLoginOpen(true)}
          >
            {t("login.action")}
          </button>
        )}
      </div>

      <LoginDialog open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  );
}
