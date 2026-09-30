import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

export const languages = [
  { code: "zh", label: "简体中文" },
  { code: "en", label: "English" },
] as const;

export type LanguageCode = (typeof languages)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    supportedLngs: languages.map((language) => language.code),
    nonExplicitSupportedLngs: true,
    fallbackLng: "zh",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "bili-cat-language",
    },
  });

export default i18n;
