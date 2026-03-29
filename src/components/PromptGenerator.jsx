"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Download, Hash, Type, Cpu, AlertCircle, FileText, Copy, Check, Settings, Lightbulb, Lock, Save, Edit3, ChevronDown, ChevronUp, Zap, ClipboardList, SlidersHorizontal, Ban, CheckSquare, Square, Search, Globe, Wand2 } from "lucide-react";

import { useApiKeys } from "@/context/ApiKeyContext";
import { useLanguage } from "@/context/LanguageContext";
import { copyToClipboard, downloadPromptsCsv, parseNumberedPrompts } from "@/lib/promptUtils";
import { mapApiError } from "@/lib/apiErrors";
import { getAntiRepeatSample, saveToPromptHistory } from "@/lib/promptHistory";
import { getRandomSubjects } from "@/lib/subjectPool";
import { getCategoryUsage, recordMultipleCategoryUsage } from "@/lib/categoryTracker";
import { PROVIDERS_UI } from "@/config/models";
import { PROMPT_TEMPLATES } from "@/config/templates";
import DebugPanel from "@/components/DebugPanel";
import { buildSystemPrompt, getRequestInfo, buildRequestBodyPreview } from "@/lib/promptBuilder";

function formatModelName(raw) {
  if (!raw) return "";
  if (raw.startsWith("or:")) {
    const full = raw.slice(3);
    const short = full.split("/").pop()?.split(":")[0] || full;
    return short.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  if (raw.startsWith("hf:")) {
    const full = raw.slice(3);
    const short = full.split("/").pop() || full;
    return short.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  if (raw.endsWith("+search")) {
    const base = raw.replace("+search", "");
    const name = base === "gemini-2.5-flash" ? "Gemini 2.5 Flash" : base;
    return `${name} + Search`;
  }
  const map = {
    "gemini": "Gemini 2.5 Flash",
    "gemini-lite": "Gemini Flash-Lite",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gemini-2.5-flash-lite": "Gemini Flash-Lite",
    "groq": "Llama 3.3 70B",
    "groq-scout": "Llama 4 Scout",
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
    "meta-llama/llama-4-scout-17b-16e-instruct": "Llama 4 Scout",
    "mistral": "Mixtral 8x22B",
    "open-mixtral-8x22b": "Mixtral 8x22B",
    "openrouter": "OpenRouter",
  };
  return map[raw] || raw;
}

function PipelineTracker({ step, providerLabel, isResearch, t }) {
  if (step === 0) return null;
  const steps = isResearch
    ? [
        { id: 1, label: t("prompt.stepPreparing"), desc: t("prompt.descValidating") },
        { id: 2, label: t("prompt.stepResearching"), desc: t("prompt.descSearching") },
        { id: 3, label: t("prompt.stepGenerating"), desc: t("prompt.descMarketWriting") },
        { id: 4, label: t("prompt.stepComplete"), desc: t("prompt.descResearchReady") },
      ]
    : [
        { id: 1, label: t("prompt.stepPreparing"), desc: t("prompt.descValidating") },
        { id: 2, label: t("prompt.stepConnecting"), desc: t("prompt.descSendingTo") },
        { id: 3, label: t("prompt.stepGenerating"), desc: t("prompt.descWriting") },
        { id: 4, label: t("prompt.stepComplete"), desc: t("prompt.descAllReady") },
      ];
  return (
    <div className="pipeline-wrap">
      <div className="pipeline-track">
        {steps.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="pipeline-step-group">
              <div className={`pipeline-step${done ? " done" : active ? " active" : " pending"}`}>
                <div className="pipeline-dot">
                  {done ? <Check size={11} strokeWidth={3} /> : active ? <span className="pipeline-pulse" /> : null}
                </div>
                <span className="pipeline-label">{s.label}</span>
                {active && <span className="pipeline-desc">{s.id === 2 && !isResearch ? `${s.desc} ${providerLabel}` : s.desc}</span>}
              </div>
              {i < steps.length - 1 && (
                <div className={`pipeline-line${step > s.id ? " filled" : ""}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TEMPLATE_NAME_KEYS = {
  "Business": "templates.business",
  "Technology": "templates.technology",
  "Healthcare": "templates.healthcare",
  "Education": "templates.education",
  "Real Estate": "templates.realEstate",
  "Food": "templates.food",
  "Nature": "templates.nature",
  "Wellness": "templates.wellness",
  "Finance": "templates.finance",
  "Travel": "templates.travel",
  "Remote Work": "templates.remoteWork",
  "Abstract": "templates.abstract",
  "Medical": "templates.medical",
  "Social Media": "templates.socialMedia",
  "Icon Set": "templates.iconSet",
  "Pattern": "templates.pattern",
  "Isometric": "templates.isometric",
  "Character": "templates.character",
  "Logo": "templates.logo",
  "Product Demo": "templates.productDemo",
  "Corporate": "templates.corporate",
  "Aerial": "templates.aerial",
  "Timelapse": "templates.timelapse",
  "Action": "templates.action",
};

export default function PromptGenerator({
  type = "image",
  title = "Prompt Generator",
  description = "Generate prompts with AI",
  icon: Icon = Sparkles,
  gradient,
  storagePrefix = "prompt",
  titleKey,
  descKey,
  advancedTitleKey,
  placeholderKey,
}) {
  const { getAllKeys, selectedModels } = useApiKeys();
  const { t } = useLanguage();
  const [concept, setConcept] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [model, setModel] = useState("google");
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(-1);
  const [copiedAll, setCopiedAll] = useState(false);
  const [advancedOn, setAdvancedOn] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modelUsed, setModelUsed] = useState("");
  const [genStep, setGenStep] = useState(0);
  const resetTimer = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [lighting, setLighting] = useState("");
  const [camera, setCamera] = useState("");
  const [shot, setShot] = useState("");
  const [speed, setSpeed] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [marketResearch, setMarketResearch] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [debugData, setDebugData] = useState(null);
  const [mounted, setMounted] = useState(false);

  const displayTitle = titleKey ? t(titleKey) : title;
  const displayDesc = descKey ? t(descKey) : description;
  const advancedTitle = advancedTitleKey ? t(advancedTitleKey) : t("prompt.advancedInstructions");
  const displayPlaceholder = placeholderKey ? t(placeholderKey) : t("prompt.placeholder");

  const templates = PROMPT_TEMPLATES[type] || PROMPT_TEMPLATES.image;

  const providerInfo = PROVIDERS_UI.find((p) => p.value === model) || PROVIDERS_UI[0];
  const actualModelKey = model === "openrouter"
    ? "openrouter"
    : model === "huggingface"
    ? (selectedModels?.huggingface || "hf-llama")
    : (selectedModels && selectedModels[providerInfo.apiKey]) || providerInfo.apiKey;
  const apiKeys = getAllKeys(providerInfo.apiKey).filter((k) => k.trim());
  const apiKeysByModel = {
    gemini: getAllKeys("gemini"),
    groq: getAllKeys("groq"),
    mistral: getAllKeys("mistral"),
    openrouter: getAllKeys("openrouter"),
    huggingface: getAllKeys("huggingface"),
  };
  const hasApiKey = apiKeys.length > 0;

  useEffect(() => {
    const savedText = localStorage.getItem(`${storagePrefix}_advanced_instructions`);
    const savedState = localStorage.getItem(`${storagePrefix}_advanced_on`);
    if (savedState === "true") {
      setAdvancedOn(true);
      if (savedText) { setCustomInstructions(savedText); setShowEditor(false); }
      else { setShowEditor(true); }
    }
  }, [storagePrefix]);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  useEffect(() => { setMounted(true); }, []);

  const toggleAdvanced = () => {
    if (advancedOn) {
      setAdvancedOn(false);
      setShowEditor(false);
      setSaved(false);
      localStorage.setItem(`${storagePrefix}_advanced_on`, "false");
    } else {
      setAdvancedOn(true);
      localStorage.setItem(`${storagePrefix}_advanced_on`, "true");
      const savedText = localStorage.getItem(`${storagePrefix}_advanced_instructions`);
      if (savedText) { setCustomInstructions(savedText); setShowEditor(false); }
      else { setShowEditor(true); }
    }
  };

  const saveInstructions = () => {
    if (customInstructions.trim()) {
      localStorage.setItem(`${storagePrefix}_advanced_instructions`, customInstructions);
      setSaved(true);
      setTimeout(() => { setShowEditor(false); setSaved(false); }, 500);
    } else {
      localStorage.removeItem(`${storagePrefix}_advanced_instructions`);
      setShowEditor(false);
    }
  };

  const generate = async () => {
    if (!concept.trim()) return setError(t("errors.invalidInput"));
    if (marketResearch) {
      if (!hasGeminiKey) return setError(t("prompt.marketResearchRequires"));
    } else if (!hasApiKey) {
      return setError(t("errors.addApiKey"));
    }
    setError("");
    setLoading(true);
    setPrompts([]);
    setModelUsed("");
    setSelected(new Set());
    if (resetTimer.current) clearTimeout(resetTimer.current);

    setGenStep(1);

    try {
      const antiRepeat = getAntiRepeatSample(type);
      const payload = { concept: concept.trim(), quantity, model: actualModelKey, apiKeys, apiKeysByModel, type, previousPrompts: antiRepeat };
      if (advancedOn && customInstructions.trim()) {
        payload.customInstructions = customInstructions.trim();
      }
      if (type === "video") {
        if (camera) payload.camera = camera;
        if (shot) payload.shot = shot;
        if (speed) payload.speed = speed;
        if (mood) payload.mood = mood;
      } else {
        if (style) payload.style = style;
        if (mood) payload.mood = mood;
        if (lighting) payload.lighting = lighting;
      }
      if (negativePrompt.trim()) payload.negativePrompt = negativePrompt.trim();
      if (marketResearch) payload.marketResearch = true;

      const sysPrompt = marketResearch
        ? "(Market Research mode — the system prompt includes Google Search results and is built server-side)"
        : buildSystemPrompt(type, quantity, payload.customInstructions || "", {
            style: payload.style, mood: payload.mood, lighting: payload.lighting,
            camera: payload.camera, shot: payload.shot, speed: payload.speed,
            negativePrompt: payload.negativePrompt,
          });
      setDebugData({
        hasData: true,
        userInput: {
          concept: concept.trim(), quantity, provider: model, model: actualModelKey, type,
          ...(payload.style && { style: payload.style }),
          ...(payload.mood && { mood: payload.mood }),
          ...(payload.lighting && { lighting: payload.lighting }),
          ...(payload.camera && { camera: payload.camera }),
          ...(payload.shot && { shot: payload.shot }),
          ...(payload.speed && { speed: payload.speed }),
          ...(payload.negativePrompt && { negativePrompt: payload.negativePrompt }),
          ...(payload.customInstructions && { customInstructions: payload.customInstructions }),
          ...(marketResearch && { marketResearch: true }),
        },
        systemPrompt: sysPrompt,
        userMessage: `${concept.trim()}\n\n[Server-side additions (auto-injected on every request):\n• Random session seed (forces different AI output each time)\n• Random creative angles: era, region, mood, style, lighting, subject\n${antiRepeat.length > 0 ? `• ${antiRepeat.length} previously generated prompts sent as "DO NOT repeat" context (from your local history)\n` : "• No prompt history yet — generates from seed + creative angles only\n"}→ This ensures each generation is unique and never repeats past results]`,
        requestInfo: null,
        requestBody: null,
        rawResponse: null,
        parsedOutput: null,
      });

      await new Promise(r => setTimeout(r, 400));
      setGenStep(2);

      const res = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = t("errors.requestFailed");
        try {
          const text = await res.text();
          if (text.trim().startsWith("{")) {
            errMsg = mapApiError(JSON.parse(text), t);
          }
        } catch {}
        throw new Error(errMsg);
      }

      setGenStep(3);
      const usedModel = res.headers.get("x-model-used") || model;
      setModelUsed(usedModel);
      const responseStatus = `${res.status} ${res.ok ? "OK" : "Error"}`;
      setDebugData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          requestInfo: {
            ...getRequestInfo(usedModel),
            responseStatus,
            responseModel: usedModel,
          },
          requestBody: buildRequestBodyPreview(usedModel, prev.systemPrompt, prev.userMessage),
        };
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", lastParsed = [];
      const hasCustom = advancedOn && customInstructions.trim();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        if (!hasCustom) {
          const parsed = parseNumberedPrompts(buf, quantity);
          if (parsed.length > lastParsed.length) {
            lastParsed = parsed;
            setPrompts([...parsed]);
          }
        }
      }
      const final = parseNumberedPrompts(buf, quantity);
      if (final.length) {
        setPrompts([...final]);
        saveToPromptHistory(type, final);
      }

      setDebugData(prev => prev ? {
        ...prev,
        rawResponse: buf,
        parsedOutput: final.length > 0
          ? `${final.length} ${t("debug.promptCount")}:\n\n${final.map((p, i) => `${i + 1}. ${p}`).join("\n\n")}`
          : "(empty — check the raw response above)",
      } : prev);

      setGenStep(4);
      resetTimer.current = setTimeout(() => setGenStep(0), 5000);
    } catch (e) {
      setError(e.message);
      setGenStep(0);
    } finally {
      setLoading(false);
    }
  };

  const autoGenerate = async () => {
    if (marketResearch && !hasGeminiKey) return setError(t("prompt.marketResearchRequires"));
    const useMarketResearch = marketResearch && hasGeminiKey;
    if (!useMarketResearch && !hasApiKey) return setError(t("errors.addApiKey"));
    setError("");
    setLoading(true);
    setPrompts([]);
    setModelUsed("");
    setSelected(new Set());
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setGenStep(1);

    try {
      const usage = getCategoryUsage(type);
      const picks = getRandomSubjects(usage, 1);
      const pick = picks[0];
      const autoSubject = pick.subject;
      const autoCategory = pick.category;

      const antiRepeat = getAntiRepeatSample(type);
      const payload = {
        concept: autoSubject,
        quantity,
        model: useMarketResearch ? "gemini" : actualModelKey,
        apiKeys,
        apiKeysByModel,
        type,
        previousPrompts: antiRepeat,
        autoMode: true,
        autoSubject,
        autoCategory,
      };
      if (advancedOn && customInstructions.trim()) {
        payload.customInstructions = customInstructions.trim();
      }
      if (type === "video") {
        if (camera) payload.camera = camera;
        if (shot) payload.shot = shot;
        if (speed) payload.speed = speed;
        if (mood) payload.mood = mood;
      } else {
        if (style) payload.style = style;
        if (mood) payload.mood = mood;
        if (lighting) payload.lighting = lighting;
      }
      if (negativePrompt.trim()) payload.negativePrompt = negativePrompt.trim();
      if (useMarketResearch) payload.marketResearch = true;

      const sysPrompt = useMarketResearch
        ? "(Auto + Market Research mode — the system prompt includes Google Search results and is built server-side)"
        : buildSystemPrompt(type, quantity, payload.customInstructions || "", {
            style: payload.style, mood: payload.mood, lighting: payload.lighting,
            camera: payload.camera, shot: payload.shot, speed: payload.speed,
            negativePrompt: payload.negativePrompt,
          });
      setDebugData({
        hasData: true,
        userInput: {
          concept: `[AUTO] ${autoSubject}`, quantity, provider: useMarketResearch ? "google" : model, model: useMarketResearch ? "gemini" : actualModelKey, type,
          autoMode: true, autoCategory,
          ...(useMarketResearch && { marketResearch: true }),
          ...(payload.style && { style: payload.style }),
          ...(payload.mood && { mood: payload.mood }),
          ...(payload.lighting && { lighting: payload.lighting }),
          ...(payload.camera && { camera: payload.camera }),
          ...(payload.shot && { shot: payload.shot }),
          ...(payload.speed && { speed: payload.speed }),
          ...(payload.negativePrompt && { negativePrompt: payload.negativePrompt }),
        },
        systemPrompt: sysPrompt,
        userMessage: `[AUTO MODE${useMarketResearch ? " + MARKET RESEARCH" : ""}] Subject: ${autoSubject} (Category: ${autoCategory})\n\n[Server-side additions:\n• Halal content rule (no human figures)\n• Random session seed\n• Type-aware creative angles (${type})\n${antiRepeat.length > 0 ? `• ${antiRepeat.length} previously generated prompts as anti-repeat context\n` : ""}${useMarketResearch ? "• Google Search for trending microstock topics\n" : ""}]`,
        requestInfo: null,
        requestBody: null,
        rawResponse: null,
        parsedOutput: null,
      });

      await new Promise(r => setTimeout(r, 400));
      setGenStep(2);

      const res = await fetch("/api/generate-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = t("errors.requestFailed");
        try {
          const text = await res.text();
          if (text.trim().startsWith("{")) {
            errMsg = mapApiError(JSON.parse(text), t);
          }
        } catch {}
        throw new Error(errMsg);
      }

      setGenStep(3);
      const usedModel = res.headers.get("x-model-used") || model;
      setModelUsed(usedModel);
      const responseStatus = `${res.status} ${res.ok ? "OK" : "Error"}`;
      setDebugData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          requestInfo: {
            ...getRequestInfo(usedModel),
            responseStatus,
            responseModel: usedModel,
          },
          requestBody: buildRequestBodyPreview(usedModel, prev.systemPrompt, prev.userMessage),
        };
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", lastParsed = [];
      const hasCustom = advancedOn && customInstructions.trim();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        if (!hasCustom) {
          const parsed = parseNumberedPrompts(buf, quantity);
          if (parsed.length > lastParsed.length) {
            lastParsed = parsed;
            setPrompts([...parsed]);
          }
        }
      }
      const final = parseNumberedPrompts(buf, quantity);
      if (final.length) {
        setPrompts(final);
        saveToPromptHistory(type, final);
        recordMultipleCategoryUsage(type, [autoCategory]);
        setDebugData(prev => prev ? { ...prev, rawResponse: buf.slice(0, 3000), parsedOutput: final } : prev);
      }
      setGenStep(4);
      resetTimer.current = setTimeout(() => setGenStep(0), 5000);
    } catch (e) {
      setError(e.message);
      setGenStep(0);
    } finally {
      setLoading(false);
    }
  };

  const copyOne = async (text, i) => {
    await copyToClipboard(text);
    setCopied(i);
    setTimeout(() => setCopied(-1), 1400);
  };

  const copyAll = async () => {
    const list = selected.size > 0
      ? prompts.filter((_, i) => selected.has(i)).map((p, i) => `${i + 1}. ${p}`)
      : prompts.map((p, i) => `${i + 1}. ${p}`);
    await copyToClipboard(list.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  const toggleSelect = (i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(prompts.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  const downloadCSV = () => {
    const list = selected.size > 0 ? prompts.filter((_, i) => selected.has(i)) : prompts;
    downloadPromptsCsv(list, storagePrefix);
  };


  const iconStyle = gradient ? { background: gradient } : undefined;
  const toggleStyle = gradient && advancedOn ? { background: gradient } : undefined;
  const advancedIconStyle = gradient && advancedOn
    ? { background: gradient, boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }
    : {};

  const hasActiveSettings = style || mood || lighting || camera || shot || speed || negativePrompt;
  const hasGeminiKey = mounted && getAllKeys("gemini").some(k => k.trim());

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-icon" style={iconStyle}><Icon size={24} /></div>
        <h1 className="page-title">{displayTitle}</h1>
        <p className="page-desc">{displayDesc}</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="field-group">
            <label className="field-label" htmlFor="prompt-input"><Type size={15} />{t("prompt.yourPrompt")}</label>
            <input id="prompt-input" type="text" className="field" placeholder={displayPlaceholder} value={concept} onChange={(e) => setConcept(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && generate()} />
          </div>

          <div className="toolbar-row">
            <button className={`toolbar-btn${showTemplates ? " toolbar-btn-active" : ""}`} onClick={() => { setShowTemplates(!showTemplates); if (!showTemplates) setShowSettings(false); }}>
              <Zap size={13} />
              <span>{t("prompt.quickTemplates")}</span>
              {showTemplates ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            <button className={`toolbar-btn${showSettings ? " toolbar-btn-active" : ""}${hasActiveSettings ? " toolbar-btn-dot" : ""}`} onClick={() => { setShowSettings(!showSettings); if (!showSettings) setShowTemplates(false); }}>
              <SlidersHorizontal size={13} />
              <span>{t("prompt.promptSettings")}</span>
              {showSettings ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {model === "google" && (
              <button
                className={`toolbar-btn${marketResearch ? " toolbar-btn-active toolbar-btn-research" : ""}`}
                onClick={() => setMarketResearch(!marketResearch)}
                title={hasGeminiKey ? t("prompt.marketResearchTip") : t("prompt.marketResearchRequires")}
                style={{ opacity: hasGeminiKey ? 1 : 0.5 }}
                disabled={!hasGeminiKey}
              >
                <Globe size={13} />
                <span>{t("prompt.marketResearch")}</span>
                {marketResearch && <Check size={13} />}
              </button>
            )}
          </div>

          {showTemplates && (
            <div className="toolbar-panel">
              <div className="template-list">
                {templates.map((tmpl) => (
                  <button key={tmpl.name} className="template-chip" onClick={() => { setConcept(tmpl.prompt); setShowTemplates(false); }}>
                    {TEMPLATE_NAME_KEYS[tmpl.name] ? t(TEMPLATE_NAME_KEYS[tmpl.name]) : tmpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSettings && (
            <div className="toolbar-panel">
              {type === "video" ? (
                <div className="settings-grid">
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.camera")}</label>
                    <input className="field field-sm" placeholder={t("prompt.cameraPlaceholder")} value={camera} onChange={e => setCamera(e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.shotType")}</label>
                    <input className="field field-sm" placeholder={t("prompt.shotPlaceholder")} value={shot} onChange={e => setShot(e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.pacing")}</label>
                    <input className="field field-sm" placeholder={t("prompt.pacingPlaceholder")} value={speed} onChange={e => setSpeed(e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.mood")}</label>
                    <input className="field field-sm" placeholder={t("prompt.moodPlaceholder")} value={mood} onChange={e => setMood(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="settings-grid">
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.style")}</label>
                    <input className="field field-sm" placeholder={t("prompt.stylePlaceholder")} value={style} onChange={e => setStyle(e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.mood")}</label>
                    <input className="field field-sm" placeholder={t("prompt.moodPlaceholder")} value={mood} onChange={e => setMood(e.target.value)} />
                  </div>
                  <div className="settings-field">
                    <label className="settings-label">{t("prompt.lighting")}</label>
                    <input className="field field-sm" placeholder={t("prompt.lightingPlaceholder")} value={lighting} onChange={e => setLighting(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="settings-field settings-negative">
                <label className="settings-label"><Ban size={12} /> {t("prompt.exclude")}</label>
                <input className="field field-sm" placeholder={t("prompt.excludePlaceholder")} value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} />
              </div>
            </div>
          )}

          {marketResearch && (
            <div className="research-banner">
              <Globe size={14} />
              <span>{t("prompt.marketResearchBanner")}</span>
            </div>
          )}

          <div className="form-grid">
            <div>
              <label className="field-label" htmlFor="quantity-input"><Hash size={15} />{t("prompt.quantity")}</label>
              <input id="quantity-input" type="number" className="field" min={1} max={100} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(100, +e.target.value || 1)))} />
            </div>
            <div>
              <label className="field-label" htmlFor="model-select"><Cpu size={15} />{t("prompt.aiProvider")}</label>
              <select id="model-select" className="field" value={model} onChange={(e) => { setModel(e.target.value); if (e.target.value !== "google") setMarketResearch(false); }} disabled={marketResearch}>
                {PROVIDERS_UI.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="error"><AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{error}</span></div>}

          <div className="actions">
            <button className="btn btn-primary" onClick={generate} disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" />{marketResearch ? t("prompt.researching") : t("prompt.generating")}</> : <>{marketResearch ? <Globe size={16} /> : <Sparkles size={16} />}{marketResearch ? t("prompt.researchGenerate") : t("prompt.generatePrompts")}</>}
            </button>
            <button
              className="btn btn-auto"
              onClick={autoGenerate}
              disabled={loading || !hasApiKey}
              title={t("prompt.autoGenerateTip")}
            >
              {loading ? <><span className="spinner spinner-sm" />{t("prompt.autoGenerating")}</> : <><Wand2 size={16} />{t("prompt.autoGenerate")}</>}
            </button>
            {prompts.length > 0 && !loading && (
              <>
                <button className="btn btn-secondary" onClick={copyAll}>
                  {copiedAll ? <><Check size={16} />{t("prompt.copied")}</> : <><ClipboardList size={16} />{selected.size > 0 ? `${t("prompt.copyCount")} ${selected.size}` : t("prompt.copyAll")}</>}
                </button>
                <button className="btn btn-secondary" onClick={downloadCSV}><Download size={16} />{t("prompt.csv")}</button>
                <button className="btn btn-ghost" onClick={selected.size === prompts.length ? deselectAll : selectAll}>
                  {selected.size === prompts.length ? <><Square size={14} />{t("prompt.deselect")}</> : <><CheckSquare size={14} />{t("prompt.selectAll")}</>}
                </button>
              </>
            )}
            {prompts.length > 0 && !loading && (
              <span className="badge"><FileText size={13} />{selected.size > 0 ? `${selected.size}/${prompts.length}` : prompts.length} prompts</span>
            )}
            {modelUsed && !loading && <span className="badge" title={modelUsed}>{t("prompt.model")}: {formatModelName(modelUsed)}</span>}
          </div>

          <PipelineTracker step={genStep} providerLabel={providerInfo.label} isResearch={marketResearch} t={t} />
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="advanced-header">
            <div className="advanced-left">
              <div className={`advanced-icon ${advancedOn ? "on" : "off"}`} style={advancedIconStyle}>
                {advancedOn ? <Settings size={16} /> : <Lock size={16} />}
              </div>
              <div>
                <span className="advanced-title">{advancedTitle}</span>
                <p className="advanced-status">
                  {!advancedOn ? t("prompt.off") :
                   !showEditor && customInstructions ? t("prompt.onSaved") :
                   t("prompt.onEnter")}
                </p>
              </div>
            </div>
            <button className="toggle-btn" onClick={toggleAdvanced} aria-label={advancedOn ? "Disable" : "Enable"}>
              {advancedOn ? (
                <div className="toggle-track on" style={toggleStyle}><div className="toggle-thumb on" /></div>
              ) : (
                <div className="toggle-track off"><div className="toggle-thumb off" /></div>
              )}
            </button>
          </div>

          {advancedOn && showEditor && (
            <div className="advanced-content">
              <textarea className="field" rows={6} placeholder={t("prompt.instructionsPlaceholder")} value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} />
              <div className="advanced-actions">
                <button className="btn btn-primary" onClick={saveInstructions}>
                  {saved ? <><Check size={16} />{t("prompt.saved")}</> : <><Save size={16} />{t("prompt.save")}</>}
                </button>
                <p className="field-hint">{t("prompt.saveHint")}</p>
              </div>
            </div>
          )}

          {advancedOn && !showEditor && customInstructions && (
            <div className="advanced-saved">
              <button className="btn btn-secondary" onClick={() => setShowEditor(true)}>
                <Edit3 size={16} />{t("prompt.editInstructions")}
              </button>
            </div>
          )}
        </div>
      </div>

      {(prompts.length > 0 || loading) && (
        <div className="card">
          <div className="card-top card-top-flex">
            <span className="field-label" style={{ margin: 0 }}><Sparkles size={15} />{t("prompt.generatedPrompts")}</span>
            {loading && (
              <div className="card-top-loading">
                <span className="spinner spinner-sm" />
                <span>{t("prompt.creating")}</span>
              </div>
            )}
          </div>
          <div className="card-body">
            {loading && prompts.length === 0 && (
              <div className="loading">
                <span className="spinner spinner-lg" />
                <div className="loading-text">
                  <p className="loading-title">{t("prompt.generatingYour")}</p>
                  <p className="loading-desc">{t("prompt.creatingUnique")}</p>
                </div>
              </div>
            )}
            <div className="prompt-list">
              {prompts.map((p, i) => (
                <div key={i} className={`prompt${selected.has(i) ? " prompt-selected" : ""}`} style={{ animation: `slideUp 0.2s ease ${Math.min(i * 0.02, 0.2)}s both` }}>
                  <button className="btn-icon prompt-check" onClick={() => toggleSelect(i)} title={selected.has(i) ? t("prompt.deselect") : t("prompt.selectAll")}>
                    {selected.has(i) ? <CheckSquare size={16} style={{ color: "var(--accent)" }} /> : <Square size={16} />}
                  </button>
                  <span className="prompt-num">{i + 1}</span>
                  <span className="prompt-text">{p}</span>
                  <button className="btn-icon prompt-copy" onClick={() => copyOne(p, i)} title={t("prompt.copyCount")}>
                    {copied === i ? <Check size={15} style={{ color: "var(--success)" }} /> : <Copy size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!loading && prompts.length === 0 && genStep === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon"><Lightbulb size={22} /></div>
          <p className="empty-state-title">{t("prompt.yourPrompt")}</p>
          <p className="empty-state-desc">{advancedTitle}</p>
        </div>
      )}

      {debugData && <DebugPanel debugData={debugData} />}

      {copied >= 0 && <div className="toast"><Check size={16} />{t("prompt.copied")}</div>}
      {copiedAll && <div className="toast"><Check size={16} />{t("prompt.copied")}</div>}
    </div>
  );
}
