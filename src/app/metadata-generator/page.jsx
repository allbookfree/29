"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, X, AlertCircle, ScanSearch,
  Download, Play, Square, FileImage,
  CheckCircle2, XCircle, Clock, Loader2,
  Image as ImageIcon, Layers, ChevronDown, ChevronUp,
  Sparkles, RotateCcw, FileSpreadsheet,
} from "lucide-react";
import { useApiKeys } from "@/context/ApiKeyContext";
import { useLanguage } from "@/context/LanguageContext";
import { mapApiError } from "@/lib/apiErrors";
import DebugPanel from "@/components/DebugPanel";
import { getRequestInfo } from "@/lib/promptBuilder";
import { METADATA_PROMPTS } from "@/lib/metadataPrompts";

const MAX_FILES = 500;

const STATIC_PROVIDER_LABEL = {
  "gemini-2.5-flash": "Gemini Flash",
  "gemini-2.5-flash-lite": "Gemini Flash-Lite",
  "groq-scout": "Groq Scout",
};

function formatProviderLabel(provider) {
  if (!provider) return "";
  if (STATIC_PROVIDER_LABEL[provider]) return STATIC_PROVIDER_LABEL[provider];
  if (provider.startsWith("openrouter:")) {
    const modelSlug = provider.replace("openrouter:", "");
    const nice = modelSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bIt\b/gi, "")
      .replace(/\bVl\b/gi, "VL")
      .replace(/\bVl\b/gi, "VL")
      .replace(/\s+/g, " ")
      .trim();
    return `OR: ${nice}`;
  }
  if (provider.startsWith("hf:")) {
    const modelSlug = provider.replace("hf:", "");
    const nice = modelSlug
      .replace(/-/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bVl\b/gi, "VL")
      .replace(/\s+/g, " ")
      .trim();
    return `HF: ${nice}`;
  }
  return provider;
}

const MAX_SIDE_PX = 768;
const COMPRESS_QUALITY = 0.80;

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_SIDE_PX || height > MAX_SIDE_PX) {
          if (width >= height) { height = Math.round((height / width) * MAX_SIDE_PX); width = MAX_SIDE_PX; }
          else { width = Math.round((width / height) * MAX_SIDE_PX); height = MAX_SIDE_PX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", COMPRESS_QUALITY));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status, t }) {
  const map = {
    pending:    { icon: <Clock size={11} />,           label: t("metadata.pending"),    cls: "badge-pending" },
    processing: { icon: <Loader2 size={11} className="spin" />, label: t("metadata.analyzing"), cls: "badge-processing" },
    done:       { icon: <CheckCircle2 size={11} />,    label: t("metadata.done"),       cls: "badge-done" },
    error:      { icon: <XCircle size={11} />,         label: t("metadata.error"),      cls: "badge-error" },
    skipped:    { icon: <X size={11} />,               label: t("metadata.skipped"),    cls: "badge-skipped" },
  };
  const s = map[status] || map.pending;
  return <span className={`status-badge ${s.cls}`}>{s.icon}{s.label}</span>;
}

function MetadataCard({ entry, result, index, onRemove, running, expanded, onToggle, t }) {
  const status = result?.status || "pending";
  const isDone = status === "done";
  const isProcessing = status === "processing";
  const isError = status === "error";

  return (
    <div className={`mgc ${isProcessing ? "mgc-active" : ""} ${isDone ? "mgc-done" : ""}`}>
      <div className="mgc-thumb-wrap">
        {entry.preview
          ? <img src={entry.preview} alt={entry.file.name} className="mgc-thumb" />
          : <div className="mgc-thumb-placeholder"><FileImage size={20} /></div>
        }
        {isProcessing && (
          <div className="mgc-thumb-overlay">
            <Loader2 size={22} className="spin" style={{ color: "#fff" }} />
          </div>
        )}
        {isDone && (
          <div className="mgc-thumb-check"><CheckCircle2 size={14} /></div>
        )}
        {!running && (
          <button className="mgc-remove" onClick={() => onRemove(entry.id)} aria-label="Remove">
            <X size={10} />
          </button>
        )}
        <span className="mgc-index">{index + 1}</span>
      </div>

      <div className="mgc-body">
        <div className="mgc-header">
          <span className="mgc-filename" title={entry.file.name}>{entry.file.name}</span>
          <StatusBadge status={status} t={t} />
        </div>

        {isDone && (
          <>
            <p className="mgc-title">{result.title}</p>
            <p className="mgc-desc">{result.description}</p>
            <div className="mgc-footer">
              <span className="kw-count">{result.keywordCount} {t("metadata.kw")}</span>
              {result.provider && (
                <span className="mgc-provider">{formatProviderLabel(result.provider)}</span>
              )}
              <button className="mgc-expand-btn" onClick={onToggle}>
                {expanded ? <><ChevronUp size={12} />{t("metadata.less")}</> : <><ChevronDown size={12} />{t("metadata.keywords")}</>}
              </button>
            </div>
            {expanded && (
              <div className="mgc-keywords-wrap">
                <p className="mgc-keywords">{result.keywords}</p>
              </div>
            )}
          </>
        )}

        {isProcessing && (
          <div className="mgc-shimmer">
            <div className="shimmer-line w-75" />
            <div className="shimmer-line w-50" />
            <div className="shimmer-line w-90" />
          </div>
        )}

        {isError && (
          <p className="mgc-error">{result.error || t("metadata.analysisFailed")}</p>
        )}

        {status === "pending" && (
          <p className="mgc-waiting">{t("metadata.waiting")}</p>
        )}

        {status === "skipped" && (
          <p className="mgc-waiting">{t("metadata.skippedMsg")}</p>
        )}
      </div>
    </div>
  );
}

export default function MetadataGeneratorPage() {
  const { getAllKeys } = useApiKeys();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [contentType, setContentType] = useState("image");
  const [running, setRunning] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(null);
  const [drag, setDrag] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const stopRef = useRef(false);
  const inputRef = useRef(null);
  const [eta, setEta] = useState("");
  const batchStartRef = useRef(null);

  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    setMounted(true);
    return () => {
      filesRef.current.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, []);

  const apiKeys      = mounted ? getAllKeys("gemini").filter(k => k.trim()) : [];
  const groqKeys     = mounted ? getAllKeys("groq").filter(k => k.trim()) : [];
  const mistralKeys  = mounted ? getAllKeys("mistral").filter(k => k.trim()) : [];
  const orKeys       = mounted ? getAllKeys("openrouter").filter(k => k.trim()) : [];
  const hfKeys       = mounted ? getAllKeys("huggingface").filter(k => k.trim()) : [];
  const hasApiKey = apiKeys.length > 0 || groqKeys.length > 0 || mistralKeys.length > 0 || orKeys.length > 0 || hfKeys.length > 0;
  const [preferredProvider, setPreferredProvider] = useState("auto");
  const [debugData, setDebugData] = useState(null);

  const doneResults = results.filter(r => r.status === "done");
  const completedCount = results.filter(r => ["done","error","skipped"].includes(r.status)).length;
  const progress = files.length > 0 ? Math.round((completedCount / files.length) * 100) : 0;

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith("image/"));
    if (!valid.length) return;
    setFiles(prev => {
      const remaining = MAX_FILES - prev.length;
      const toAdd = valid.slice(0, remaining);
      const entries = toAdd.map(f => ({
        id: `${f.name}-${f.size}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
      }));
      setResults(r => [
        ...r,
        ...entries.map(e => ({
          id: e.id,
          filename: e.file.name,
          status: "pending",
          title: "", description: "", keywords: "", keywordCount: 0, error: "",
        })),
      ]);
      return [...prev, ...entries];
    });
  }, []);

  const removeFile = (id) => {
    if (running) return;
    setFiles(prev => {
      const entry = prev.find(f => f.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter(f => f.id !== id);
    });
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const clearAll = () => {
    if (running) return;
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]); setResults([]); setGlobalError(""); setCurrentIdx(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const updateResult = (id, patch) =>
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const processOneFile = async (entry, totalCount) => {
    updateResult(entry.id, { status: "processing", error: "" });
    try {
      const base64 = await compressImage(entry.file);
      const res = await fetch("/api/generate-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          apiKeys,
          groqKeys,
          mistralKeys,
          orKeys,
          hfKeys,
          preferredProvider: preferredProvider === "auto" ? undefined : preferredProvider,
          contentType,
        }),
      });
      if (!res.ok) {
        let errMsg = t("metadata.analysisFailed");
        try {
          const text = await res.text();
          if (text.trim().startsWith("{")) errMsg = mapApiError(JSON.parse(text), t);
        } catch {}
        updateResult(entry.id, { status: "error", error: errMsg });
      } else {
        const meta = await res.json();
        updateResult(entry.id, {
          status: "done",
          title: meta.title,
          description: meta.description,
          keywords: meta.keywords,
          keywordCount: meta.keywordCount,
          provider: meta.provider || "gemini-2.5-flash",
        });
        const usedProvider = meta.provider || "gemini-2.5-flash";
        const reqInfo = getRequestInfo(usedProvider);
        setDebugData({
          hasData: true,
          userInput: { concept: entry.file.name, contentType, imageCount: totalCount, preferredProvider },
          systemPrompt: METADATA_PROMPTS[contentType] || METADATA_PROMPTS.image,
          userMessage: `[Base64 image: ${entry.file.name} (${(entry.file.size / 1024).toFixed(1)} KB, ${entry.file.type})] + contentType: ${contentType}`,
          requestBody: JSON.stringify({
            image: "(base64-encoded image data — omitted for display, sent as inlineData.data)",
            mimeType: entry.file.type,
            contentType,
            preferredProvider: preferredProvider === "auto" ? undefined : preferredProvider,
          }, null, 2),
          requestInfo: { ...reqInfo, responseStatus: "200 OK", responseModel: usedProvider },
          rawResponse: JSON.stringify(meta, null, 2),
          parsedOutput: `Title: ${meta.title || "-"}\n\nDescription: ${meta.description || "-"}\n\nKeywords (${meta.keywordCount || 0}): ${Array.isArray(meta.keywords) ? meta.keywords.join(", ") : meta.keywords || "-"}`,
        });
      }
    } catch (err) {
      updateResult(entry.id, { status: "error", error: err.message || "Network error." });
    }
  };

  const runBatch = async (fileList, { skipDone = false } = {}) => {
    setGlobalError(""); setRunning(true); stopRef.current = false;
    batchStartRef.current = Date.now();
    setEta("");
    let processedSoFar = 0;

    for (let i = 0; i < fileList.length; i++) {
      if (stopRef.current) {
        fileList.slice(i).forEach(f => updateResult(f.id, { status: "skipped" }));
        break;
      }
      const entry = fileList[i];
      if (skipDone) {
        const result = results.find(r => r.id === entry.id);
        if (result?.status === "done") { processedSoFar++; continue; }
      }

      setCurrentIdx(files.indexOf(entry));
      await processOneFile(entry, fileList.length);

      processedSoFar++;
      const elapsed = Date.now() - batchStartRef.current;
      const remaining = fileList.length - processedSoFar;
      if (processedSoFar > 0 && remaining > 0) {
        const avgMs = elapsed / processedSoFar;
        const etaSec = Math.ceil((avgMs * remaining) / 1000);
        setEta(etaSec >= 60 ? `~${Math.ceil(etaSec / 60)}m left` : `~${etaSec}s left`);
      } else {
        setEta("");
      }

      if (i < fileList.length - 1 && !stopRef.current)
        await new Promise(r => setTimeout(r, 500));
    }
    setRunning(false); setCurrentIdx(null); setEta("");
  };

  const start = async () => {
    if (!hasApiKey) return setGlobalError(t("metadata.noKeysWarning"));
    if (!files.length) return setGlobalError(t("metadata.uploadWarning"));
    await runBatch(files, { skipDone: true });
  };

  const stop = () => { stopRef.current = true; };

  const failedResults = results.filter(r => r.status === "error" || r.status === "skipped");

  const retryFailed = async () => {
    if (!hasApiKey || failedResults.length === 0) return;
    const failedIds = new Set(failedResults.map(r => r.id));
    const failedFiles = files.filter(f => failedIds.has(f.id));
    await runBatch(failedFiles);
  };

  const downloadExcel = async () => {
    if (!doneResults.length) return;
    const mod = await import("xlsx");
    const XLSX = mod.default || mod;
    const rows = [
      ["Filename", "Title", "Description", "Keywords"],
      ...doneResults.map(r => [r.filename, r.title, r.description, r.keywords]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 60 }, { wch: 80 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Metadata");
    XLSX.writeFile(wb, `metadata_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadCsv = () => {
    if (!doneResults.length) return;
    const escape = (s) => `"${(s || "").replace(/"/g, '""')}"`;
    const header = "Filename,Title,Description,Keywords";
    const rows = doneResults.map(r =>
      [escape(r.filename), escape(r.title), escape(r.description), escape(r.keywords)].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `metadata_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div
      className="page mg-page"
      onDrop={e => { e.preventDefault(); setDrag(false); if (!running) addFiles(e.dataTransfer.files); }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }}
    >
      {drag && <div className="mg-drag-overlay"><Upload size={32} /><p>{t("metadata.dropHere")}</p></div>}

      <div className="page-head" style={{ marginBottom: 20 }}>
        <div className="page-icon" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
          <ScanSearch size={24} />
        </div>
        <h1 className="page-title">{t("metadata.title")}</h1>
        <p className="page-desc">{t("metadata.description")}</p>
      </div>

      <div className="mg-bar">
        <div className="ct-selector" style={{ gap: 6 }}>
          <button className={`ct-btn ${contentType === "image" ? "ct-active" : ""}`}
            onClick={() => !running && setContentType("image")} disabled={running}>
            <ImageIcon size={14} /><span>{t("metadata.photo")}</span>
          </button>
          <button className={`ct-btn ${contentType === "vector" ? "ct-active" : ""}`}
            onClick={() => !running && setContentType("vector")} disabled={running}>
            <Layers size={14} /><span>{t("metadata.vector")}</span>
          </button>
        </div>

        <label className={`mg-upload-label ${running ? "disabled" : ""}`}>
          <Upload size={14} />
          {t("metadata.addImages")}
          {files.length > 0 && <span className="mg-bar-count">{files.length}</span>}
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => addFiles(e.target.files)} disabled={running} />
        </label>

        {(running || (files.length > 0 && completedCount > 0)) && (
          <div className="mg-bar-progress">
            <div className="mg-bar-progress-track">
              <div className="mg-bar-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{completedCount}/{files.length}</span>
            {eta && <span className="mg-eta">{eta}</span>}
          </div>
        )}

        {mounted && (
          <div className="mg-provider-selector">
            {[
              { id: "auto",            label: t("metadata.auto"),   hasKey: hasApiKey },
              { id: "gemini-2.5-flash",      label: "Gemini Flash",       hasKey: apiKeys.length > 0 },
              { id: "gemini-2.5-flash-lite", label: "Flash Lite",          hasKey: apiKeys.length > 0 },
              { id: "groq",            label: "Groq Scout",         hasKey: groqKeys.length > 0 },
              { id: "mistral",         label: "Pixtral",            hasKey: mistralKeys.length > 0 },
              { id: "openrouter",      label: "OpenRouter",         hasKey: orKeys.length > 0 },
              { id: "huggingface",     label: "HuggingFace",        hasKey: hfKeys.length > 0 },
            ].map(({ id, label, hasKey }) => (
              <button
                key={id}
                className={`ct-btn${preferredProvider === id ? " ct-active" : ""}${!hasKey ? " ct-btn-nokey" : ""}`}
                style={{ fontSize: 12, padding: "5px 11px" }}
                title={!hasKey ? t("metadata.noKeyHint") : undefined}
                onClick={() => !running && hasKey && setPreferredProvider(id)}
                disabled={running || !hasKey}
              >{label}</button>
            ))}
          </div>
        )}

        <div className="mg-bar-actions">
          {!running && files.length > 0 && (
            <button className="btn btn-ghost" style={{ padding: "8px 10px", fontSize: 13 }} onClick={clearAll}>
              <X size={13} />{t("metadata.clear")}
            </button>
          )}
          <button className="btn btn-primary" onClick={start}
            disabled={running || !files.length || !hasApiKey} style={{ padding: "9px 18px" }}>
            <Play size={14} />{t("metadata.start")}
          </button>
          {!running && failedResults.length > 0 && (
            <button className="btn btn-secondary" onClick={retryFailed}
              disabled={!hasApiKey} style={{ padding: "9px 14px" }}>
              <RotateCcw size={14} />{t("metadata.retry")} {failedResults.length}
            </button>
          )}
          <button className="btn btn-danger" onClick={stop} disabled={!running} style={{ padding: "9px 14px" }}>
            <Square size={14} />{t("metadata.stop")}
          </button>
          <button className="btn btn-secondary" onClick={downloadExcel}
            disabled={!doneResults.length} style={{ padding: "9px 14px" }}>
            <Download size={14} />{t("metadata.excel")}
          </button>
          <button className="btn btn-secondary" onClick={downloadCsv}
            disabled={!doneResults.length} style={{ padding: "9px 14px" }}>
            <FileSpreadsheet size={14} />CSV
          </button>
        </div>
      </div>

      {globalError && (
        <div className="error" style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{globalError}</span>
        </div>
      )}

      {mounted && !hasApiKey && (
        <div className="info-box" style={{ marginBottom: 16 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{t("metadata.noKeysLong")}</span>
        </div>
      )}

      {files.length === 0 ? (
        <div className="mg-empty-main">
          <div className="mg-empty-icon"><Sparkles size={28} /></div>
          <h3 className="mg-empty-title">{t("metadata.uploadTitle")}</h3>
          <p className="mg-empty-desc">
            {t("metadata.uploadDesc")}
          </p>
          <label className="btn btn-primary mg-empty-btn">
            <Upload size={16} />{t("metadata.browseImages")}
            <input type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={e => addFiles(e.target.files)} />
          </label>
        </div>
      ) : (
        <div className="mgc-grid">
          {files.map((entry, i) => {
            const result = results.find(r => r.id === entry.id);
            return (
              <MetadataCard
                key={entry.id}
                entry={entry}
                result={result}
                index={i}
                onRemove={removeFile}
                running={running}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                t={t}
              />
            );
          })}
        </div>
      )}

      {debugData && <DebugPanel debugData={debugData} />}
    </div>
  );
}
