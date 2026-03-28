"use client";

import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import translations from "@/i18n/translations";

function getLang() {
  try {
    const stored = localStorage.getItem("ai-prompt-studio-lang");
    if (stored === "bn") return "bn";
  } catch {}
  return "en";
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const lang = getLang();
      const e = translations[lang]?.errors || translations.en.errors;
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">
            <AlertTriangle size={32} />
          </div>
          <h2 className="error-boundary-title">{e.somethingWrong}</h2>
          <p className="error-boundary-desc">{e.unexpectedError}</p>
          <button className="btn btn-primary" onClick={this.handleReset}>
            <RefreshCw size={16} />
            {e.refreshPage}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
