"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import translations from "@/i18n/translations";

const LanguageContext = createContext(null);
const STORAGE_KEY = "ai-prompt-studio-lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "bn") setLangState("bn");
    } catch {}
  }, []);

  const setLang = useCallback((newLang) => {
    const validLang = newLang === "bn" ? "bn" : "en";
    setLangState(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch {}
  }, []);

  const t = useCallback((path) => {
    const keys = path.split(".");
    let val = translations[lang];
    for (const k of keys) {
      if (val && typeof val === "object" && k in val) {
        val = val[k];
      } else {
        let fallback = translations.en;
        for (const fk of keys) {
          if (fallback && typeof fallback === "object" && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return path;
          }
        }
        return typeof fallback === "string" ? fallback : path;
      }
    }
    return typeof val === "string" ? val : path;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
