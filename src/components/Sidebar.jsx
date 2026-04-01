"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Image, Palette, Video, KeyRound, PanelLeftClose, PanelLeftOpen, X, Moon, Sun, Languages, BarChart3, History } from "lucide-react";
import SettingsModal from "./SettingsModal";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

const linkKeys = [
  { key: "nav.home", href: "/", icon: Home },
  { key: "nav.imagePrompt", href: "/prompt-generator", icon: Sparkles },
  { key: "nav.vectorPrompt", href: "/vector-generator", icon: Palette },
  { key: "nav.videoPrompt", href: "/video-generator", icon: Video },
  { key: "nav.metadata", href: "/metadata-generator", icon: Image },
  { key: "nav.history", href: "/history", icon: History },
  { key: "analytics.navLabel", href: "/analytics", icon: BarChart3 },
];

export default function Sidebar({ isOpen, onToggle }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [modal, setModal] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const apiKeyRef = useRef(null);
  const themeRef = useRef(null);
  const langRef = useRef(null);
  const collapseRef = useRef(null);

  const handleApiKey = useCallback(() => setModal(true), []);
  const handleTheme = useCallback(() => toggleTheme(), [toggleTheme]);
  const handleLang = useCallback(() => setLang(lang === "en" ? "bn" : "en"), [lang, setLang]);
  const handleCollapse = useCallback(() => setCollapsed(c => !c), []);

  useEffect(() => {
    const refs = [
      { ref: apiKeyRef, handler: handleApiKey },
      { ref: themeRef, handler: handleTheme },
      { ref: langRef, handler: handleLang },
      { ref: collapseRef, handler: handleCollapse },
    ];
    const cleanups = [];
    for (const { ref, handler } of refs) {
      const el = ref.current;
      if (el) {
        el.addEventListener("click", handler);
        cleanups.push(() => el.removeEventListener("click", handler));
      }
    }
    return () => cleanups.forEach(fn => fn());
  }, [handleApiKey, handleTheme, handleLang, handleCollapse]);

  return (
    <>
      {isOpen && <div className="sidebar-overlay active" onClick={onToggle} />}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${isOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="logo-icon"><Sparkles size={18} /></div>
          {!collapsed && <span className="logo-text">PromptStudio</span>}
          <button type="button" className="sidebar-close" onClick={onToggle} aria-label={t("nav.closeSidebar")}><X size={18} /></button>
        </div>
        <nav className="sidebar-nav">
          {!collapsed && <p className="section-label">{t("nav.navigation")}</p>}
          {linkKeys.map((item) => {
            const active = pathname === item.href;
            const label = t(item.key);
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`}
                onClick={() => { if (window.innerWidth < 768) onToggle(); }}
                title={collapsed ? label : undefined}>
                <div className="nav-icon"><item.icon size={16} /></div>
                {!collapsed && <span className="nav-text">{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div ref={apiKeyRef} className="nav-item" role="button" tabIndex={0} title={collapsed ? t("nav.apiKeys") : undefined} style={{ cursor: "pointer" }}>
            <div className="nav-icon"><KeyRound size={16} /></div>
            {!collapsed && <span className="nav-text">{t("nav.apiKeys")}</span>}
          </div>
          <div ref={themeRef} className="nav-item" role="button" tabIndex={0} title={collapsed ? (theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")) : undefined} aria-label={theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")} style={{ cursor: "pointer" }}>
            <div className="nav-icon">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</div>
            {!collapsed && <span className="nav-text">{theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}</span>}
          </div>
          <div ref={langRef} className="nav-item" role="button" tabIndex={0} title={collapsed ? (lang === "en" ? "বাংলা" : "English") : undefined} style={{ cursor: "pointer" }}>
            <div className="nav-icon"><Languages size={16} /></div>
            {!collapsed && <span className="nav-text">{lang === "en" ? "বাংলা" : "English"}</span>}
          </div>
          <div ref={collapseRef} className="nav-item collapse-btn" role="button" tabIndex={0} style={{ cursor: "pointer" }}>
            <div className="nav-icon">{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</div>
            {!collapsed && <span className="nav-text" style={{ color: "var(--text3)" }}>{t("nav.collapse")}</span>}
          </div>
        </div>
      </aside>
      <SettingsModal isOpen={modal} onClose={() => setModal(false)} />
    </>
  );
}
