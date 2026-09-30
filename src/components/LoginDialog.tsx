import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { loginWithCredential } from "../bilibili/account";
import {
  generateQrcode,
  pollQrcode,
  type QrcodeSession,
  type QrcodeStatus,
} from "../bilibili/auth";
import { Credential } from "../bilibili/credential";
import "./LoginDialog.css";

const POLL_INTERVAL = 2000;

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "qrcode" | "cookie";

export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("qrcode");
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<QrcodeStatus | "loading">("loading");
  const [message, setMessage] = useState("");
  const [cookieInput, setCookieInput] = useState("");
  const [cookieError, setCookieError] = useState("");
  const alive = useRef(true);

  const poll = useCallback(
    async (key: string) => {
      if (!alive.current) return;
      try {
        const result = await pollQrcode(key);
        if (!alive.current) return;
        setMessage(result.message);
        if (result.status === "success" && result.credential) {
          setStatus("success");
          loginWithCredential(result.credential);
          window.setTimeout(onClose, 600);
          return;
        }
        setStatus(result.status);
        if (result.status !== "expired" && result.status !== "failed") {
          window.setTimeout(() => void poll(key), POLL_INTERVAL);
        }
      } catch (error) {
        if (!alive.current) return;
        setStatus("failed");
        setMessage(error instanceof Error ? error.message : String(error));
      }
    },
    [onClose],
  );

  const start = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    setImage("");
    try {
      const session: QrcodeSession = await generateQrcode();
      const dataUrl = await QRCode.toDataURL(session.url, {
        width: 220,
        margin: 1,
      });
      if (!alive.current) return;
      setImage(dataUrl);
      setStatus("pending");
      void poll(session.key);
    } catch (error) {
      if (!alive.current) return;
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [poll]);

  useEffect(() => {
    if (!open) return;
    alive.current = true;
    if (mode === "qrcode") void start();
    return () => {
      alive.current = false;
    };
  }, [open, mode, start]);

  const submitCookie = () => {
    const credential = Credential.fromCookies(cookieInput);
    if (!credential.hasSessdata) {
      setCookieError(t("login.invalidCookie"));
      return;
    }
    setCookieError("");
    loginWithCredential(credential);
    onClose();
  };

  if (!open) return null;

  // 必须挂到 body：顶栏有 backdrop-filter，会给 position:fixed 后代创建包含块，
  // 直接放在 header 里弹窗会被定位到顶栏内部（视觉上"跑上面去了"）。
  return createPortal(
    <div
      className="loginMask"
      role="dialog"
      aria-modal="true"
      aria-label={t("login.title")}
      onClick={onClose}
    >
      <div className="loginPanel" onClick={(event) => event.stopPropagation()}>
        <div className="loginTabs">
          {(["qrcode", "cookie"] as Mode[]).map((value) => (
            <button
              key={value}
              type="button"
              className={
                value === mode ? "loginTab loginTabActive" : "loginTab"
              }
              onClick={() => {
                setMode(value);
                setMessage("");
              }}
            >
              {t(`login.${value}`)}
            </button>
          ))}
          <button
            type="button"
            className="loginClose"
            onClick={onClose}
            aria-label={t("login.close")}
          >
            ×
          </button>
        </div>

        {mode === "qrcode" ? (
          <div className="loginBody">
            {image ? (
              <img
                className={
                  status === "expired" || status === "success"
                    ? "loginQr loginQrDim"
                    : "loginQr"
                }
                src={image}
                alt={t("login.qrcode")}
              />
            ) : (
              <div className="loginQr loginQrPlaceholder" />
            )}
            <p className="loginHint">{t(`login.state.${status}`)}</p>
            {message && status === "failed" ? (
              <p className="loginError">{message}</p>
            ) : null}
            {status === "expired" || status === "failed" ? (
              <button
                type="button"
                className="appButton"
                onClick={() => void start()}
              >
                {t("login.refresh")}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="loginBody">
            <textarea
              className="loginTextarea"
              value={cookieInput}
              onChange={(event) => setCookieInput(event.target.value)}
              placeholder={t("login.cookiePlaceholder")}
              rows={5}
            />
            {cookieError ? <p className="loginError">{cookieError}</p> : null}
            <p className="loginHint">{t("login.cookieHint")}</p>
            <button
              type="button"
              className="appButton"
              onClick={submitCookie}
              disabled={!cookieInput.trim()}
            >
              {t("login.submit")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
