"use client";

import { useState } from "react";
import { ApiKeyProvider } from "@/context/ApiKeyContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import Sidebar from "@/components/Sidebar";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Menu } from "lucide-react";

function LayoutInner({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="app">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main className="main">
        <button className="mobile-btn" onClick={() => setSidebarOpen(true)} aria-label={t("nav.openMenu")}>
          <Menu size={20} />
        </button>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function ClientLayout({ children }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ApiKeyProvider>
          <LayoutInner>{children}</LayoutInner>
        </ApiKeyProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
