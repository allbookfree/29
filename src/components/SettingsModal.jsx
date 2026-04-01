"use client";

import { useState, useEffect, useRef } from "react";
import { X, KeyRound, Eye, EyeOff, Save, Shield, ExternalLink, Check, Lock, Loader2, AlertTriangle, Plus, Trash2, CheckCircle, ChevronDown, RotateCcw } from "lucide-react";
import { useApiKeys } from "@/context/ApiKeyContext";
import { useLanguage } from "@/context/LanguageContext";

const PROVIDERS = [
  { key: "gemini", label: "Google", placeholder: "AIza...", color: "#4f46e5", url: "https://aistudio.google.com/app/apikey" },
  { key: "groq", label: "Groq", placeholder: "gsk_...", color: "#f97316", url: "https://console.groq.com/keys" },
  { key: "mistral", label: "Mistral", placeholder: "sk-...", color: "#8b5cf6", url: "https://console.mistral.ai/api-keys" },
  { key: "openrouter", label: "OpenRouter", placeholder: "sk-or-...", color: "#06b6d4", url: "https://openrouter.ai/settings/keys", badge: "Vision · Free", badgeColor: "#0891b2", hintKey: "settings.orHint" },
  { key: "huggingface", label: "HuggingFace", placeholder: "hf_...", color: "#ffbf00", url: "https://huggingface.co/settings/tokens", badge: "Vision · Free", badgeColor: "#d97706", hintKey: "settings.hfHint" },
];

const PROVIDER_MODELS = {
  gemini: [
    { value: "gemini", label: "Gemini 2.5 Flash", info: "10 RPM · 250/day · Best" },
    { value: "gemini-lite", label: "Gemini 2.5 Flash-Lite", info: "15 RPM · 1,000/day · Fast" },
  ],
  groq: [
    { value: "groq", label: "Llama 3.3 70B", info: "1,000 req/day · Best" },
    { value: "groq-scout", label: "Llama 4 Scout", info: "30,000 TPM · Fast" },
  ],
  mistral: [
    { value: "mistral", label: "Mixtral 8x22B", info: "Free tier" },
  ],
  openrouter: [
    { value: "or-auto", label: "Auto (Best Free)", info: "Auto-routes to best free model · Vision" },
    { value: "or-nemotron", label: "Nemotron Super 120B", info: "Free · NVIDIA · 262K context" },
    { value: "or-qwen3", label: "Qwen3 Next 80B", info: "Free · Multilingual · 262K context" },
    { value: "or-gpt-oss", label: "GPT-OSS 120B", info: "Free · OpenAI · 131K context" },
    { value: "or-llama", label: "Llama 3.3 70B", info: "Free · Meta · Proven reliable" },
    { value: "or-hermes", label: "Hermes 3 405B", info: "Free · 405B · Highest quality" },
  ],
  huggingface: [
    { value: "hf-llama", label: "Llama 3.3 70B", info: "Best quality" },
    { value: "hf-qwen", label: "Qwen 2.5 72B", info: "Multilingual" },
    { value: "hf-mistral", label: "Mistral Small 3.1", info: "Fast" },
    { value: "hf-deepseek", label: "DeepSeek V3", info: "Reasoning" },
  ],
};

function normalizeKey(val) {
  if (Array.isArray(val)) return val.length > 0 ? val : [""];
  if (typeof val === "string" && val) return [val];
  return [""];
}

export default function SettingsModal({ isOpen, onClose }) {
  const { keys, saveKeys, testKey, testResult, setTestResult, testing, storageMode, updateStorageMode, selectedModels, setSelectedModel } = useApiKeys();
  const { t } = useLanguage();
  const [vis, setVis] = useState({});
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const form = {
    gemini: normalizeKey(keys.gemini),
    groq: normalizeKey(keys.groq),
    mistral: normalizeKey(keys.mistral),
    openrouter: normalizeKey(keys.openrouter),
    huggingface: normalizeKey(keys.huggingface),
  };

  const handleSave = () => { saveKeys(form); setSaved(true); setTimeout(() => { setSaved(false); onClose(); }, 800); };
  const handleResetAll = () => {
    const APP_PREFIXES = [
      "ai-prompt-studio-keys",
      "ai-prompt-studio-storage-mode",
      "ai-prompt-studio-models",
      "ai-prompt-studio-theme",
      "ai-prompt-studio-lang",
      "ph_image", "ph_vector", "ph_video",
      "cat_tracker_image", "cat_tracker_vector", "cat_tracker_video",
    ];
    try {
      for (const key of APP_PREFIXES) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      }
    } catch {}
    setResetDone(true);
    setResetConfirm(false);
    setTimeout(() => { window.location.reload(); }, 1200);
  };
  const addKey = (provider) => { const current = [...(form[provider] || [""])]; saveKeys({ ...keys, [provider]: [...current, ""] }); };
  const updateKey = (provider, index, value) => {
    const current = [...(form[provider] || [""])];
    current[index] = value;
    saveKeys({ ...keys, [provider]: current });
    const id = `${provider}-${index}`;
    setTestResult(prev => { const next = { ...prev }; delete next[id]; return next; });
  };
  const removeKey = (provider, index) => { const current = form[provider] || [""]; if (current.length <= 1) return; saveKeys({ ...keys, [provider]: current.filter((_, i) => i !== index) }); };
  const getStatus = (provider, index) => testResult[`${provider}-${index}`];

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-wrap" onClick={(e) => e.stopPropagation()} ref={modalRef} tabIndex={-1}>
        <div className="modal-box">
          <div className="modal-head">
            <div className="modal-config-header">
              <div className="modal-config-icon"><Shield size={20} /></div>
              <div>
                <h2 className="modal-config-title">{t("settings.title")}</h2>
                <div className="modal-config-subtitle">
                  <Lock size={10} />
                  <span>{t("settings.subtitle")}</span>
                </div>
              </div>
            </div>
            <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>

          <div className="modal-body">
            <div className="modal-warning">
              <p className="modal-warning-text">
                <AlertTriangle size={14} />
                {t("settings.warning")}
              </p>
              <label className="modal-warning-label">
                <input
                  type="checkbox"
                  checked={storageMode === "session"}
                  onChange={(e) => updateStorageMode(e.target.checked ? "session" : "local")}
                />
                {t("settings.sessionMode")}
              </label>
            </div>

            <div className="modal-providers">
              {PROVIDERS.map((p) => (
                <div key={p.key} className="modal-provider">
                  <div className="modal-provider-header">
                    <div className="modal-provider-info">
                      <span className="modal-provider-dot" style={{ background: p.color }} />
                      <span className="modal-provider-name">{p.label}</span>
                      {p.badge && <span className="badge" style={{ fontSize: 10, padding: "3px 8px", background: `${p.badgeColor}18`, borderColor: `${p.badgeColor}40`, color: p.badgeColor }}>{p.badge}</span>}
                      <span className="badge" style={{ fontSize: 10, padding: "3px 10px" }}>{(form[p.key] || [""]).length} {t("settings.keys")}</span>
                    </div>
                    <a href={p.url} target="_blank" rel="noopener" className="modal-provider-link">{t("settings.getKey")} <ExternalLink size={11} /></a>
                  </div>

                  {PROVIDER_MODELS[p.key] && (
                    <div className="modal-model-selector">
                      <span className="modal-model-label">{t("settings.modelVersion")}</span>
                      <div className="modal-model-select-wrap">
                        <select
                          className="field modal-model-select"
                          value={selectedModels?.[p.key] || PROVIDER_MODELS[p.key][0].value}
                          onChange={(e) => setSelectedModel(p.key, e.target.value)}
                        >
                          {PROVIDER_MODELS[p.key].map(m => (
                            <option key={m.value} value={m.value}>{m.label} — {m.info}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="modal-model-chevron" />
                      </div>
                    </div>
                  )}

                  <div className="modal-key-list">
                    {(form[p.key] || [""]).map((keyValue, idx) => (
                      <div key={idx} className="modal-key-row">
                        <div className="modal-key-field">
                          <KeyRound size={14} className="modal-key-icon" />
                          <input
                            type={vis[`${p.key}-${idx}`] ? "text" : "password"}
                            className="field"
                            placeholder={`${p.placeholder} #${idx + 1}`}
                            value={keyValue || ""}
                            onChange={(e) => updateKey(p.key, idx, e.target.value)}
                          />
                          <button
                            className="btn-icon modal-key-toggle"
                            onClick={() => setVis({ ...vis, [`${p.key}-${idx}`]: !vis[`${p.key}-${idx}`] })}
                            aria-label={vis[`${p.key}-${idx}`] ? "Hide key" : "Show key"}
                          >
                            {vis[`${p.key}-${idx}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        <button
                          onClick={() => testKey(`${p.key}-${idx}`, keyValue, p.key)}
                          disabled={testing[`${p.key}-${idx}`] || !keyValue}
                          className="btn btn-secondary modal-test-btn"
                        >
                          {testing[`${p.key}-${idx}`] ? <Loader2 size={12} style={{ animation: "spin 0.6s linear infinite" }} /> : t("settings.test")}
                        </button>
                        {getStatus(p.key, idx) && (
                          <span className="modal-key-status" style={{ color: getStatus(p.key, idx).success ? "var(--success)" : "var(--error)" }}>
                            {getStatus(p.key, idx).success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                          </span>
                        )}
                        {form[p.key]?.length > 1 && (
                          <button onClick={() => removeKey(p.key, idx)} className="btn-icon modal-key-remove" aria-label="Remove key">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addKey(p.key)} className="btn-ghost modal-add-key"><Plus size={14} /> {t("settings.addKey")}</button>
                  {p.hintKey && (
                    <p className="modal-hint">{t(p.hintKey)}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-info">
              <p className="modal-info-text"><CheckCircle size={15} /><strong>{t("settings.autoFailover")}</strong> {t("settings.autoFailoverDesc")}</p>
            </div>

            <div className="modal-reset-section">
              <div className="modal-reset-header">
                <RotateCcw size={16} />
                <strong>{t("settings.resetTitle")}</strong>
              </div>
              <p className="modal-reset-desc">{t("settings.resetDesc")}</p>
              <p className="modal-reset-items">{t("settings.resetItems")}</p>
              {resetDone ? (
                <div className="modal-reset-success">
                  <CheckCircle size={16} /> {t("settings.resetSuccess")}
                </div>
              ) : resetConfirm ? (
                <div className="modal-reset-confirm">
                  <p className="modal-reset-warning"><AlertTriangle size={14} /> {t("settings.resetConfirm")}</p>
                  <div className="modal-reset-actions">
                    <button className="btn btn-danger" onClick={handleResetAll}><Trash2 size={14} /> {t("settings.resetConfirmBtn")}</button>
                    <button className="btn btn-secondary" onClick={() => setResetConfirm(false)}>{t("settings.resetCancelBtn")}</button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-danger-outline" onClick={() => setResetConfirm(true)}>
                  <Trash2 size={14} /> {t("settings.resetBtn")}
                </button>
              )}
            </div>
          </div>

          <div className="modal-foot">
            <button className="btn btn-secondary" onClick={onClose}>{t("settings.cancel")}</button>
            <button className="btn btn-primary" onClick={handleSave}>{saved ? <><Check size={16} />{t("prompt.saved")}</> : <><Save size={16} />{t("prompt.save")}</>}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
