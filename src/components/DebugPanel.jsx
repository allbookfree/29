"use client";

import { useState } from "react";
import { Bug, ChevronDown, ChevronUp, Copy, Check, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="dbg-copy" onClick={copy} title="Copy">
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function DebugStep({ number, label, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`dbg-step dbg-step-${color}`}>
      <button className="dbg-step-header" onClick={() => setOpen(!open)}>
        <span className="dbg-step-num">{number}</span>
        <span className="dbg-step-label">{label}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && <div className="dbg-step-body">{children}</div>}
    </div>
  );
}

function DebugEntry({ label, value }) {
  if (!value && value !== 0) return null;
  const display = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  const isLong = display.length > 120;
  return (
    <div className="dbg-entry">
      <span className="dbg-entry-label">{label}</span>
      {isLong ? (
        <pre className="dbg-entry-value dbg-pre">{display}</pre>
      ) : (
        <span className="dbg-entry-value">{display}</span>
      )}
      <CopyBtn text={display} />
    </div>
  );
}

export default function DebugPanel({ debugData }) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  if (!debugData || !debugData.hasData) return null;

  const {
    userInput,
    systemPrompt,
    requestInfo,
    rawResponse,
    parsedOutput,
  } = debugData;

  return (
    <div className="dbg-panel">
      <button className="dbg-toggle" onClick={() => setVisible(!visible)}>
        <Bug size={15} />
        <span>{t("debug.title")}</span>
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>

      {visible && (
        <div className="dbg-content">
          {userInput && (
            <DebugStep number="1" label={t("debug.step1")} color="blue" defaultOpen={true}>
              {userInput.concept && <DebugEntry label={t("debug.concept")} value={userInput.concept} />}
              {userInput.quantity && <DebugEntry label={t("debug.quantity")} value={userInput.quantity} />}
              {userInput.provider && <DebugEntry label={t("debug.provider")} value={userInput.provider} />}
              {userInput.model && <DebugEntry label={t("debug.model")} value={userInput.model} />}
              {userInput.type && <DebugEntry label={t("debug.type")} value={userInput.type} />}
              {userInput.style && <DebugEntry label={t("debug.style")} value={userInput.style} />}
              {userInput.mood && <DebugEntry label={t("debug.mood")} value={userInput.mood} />}
              {userInput.lighting && <DebugEntry label={t("debug.lighting")} value={userInput.lighting} />}
              {userInput.camera && <DebugEntry label={t("debug.camera")} value={userInput.camera} />}
              {userInput.shot && <DebugEntry label={t("debug.shot")} value={userInput.shot} />}
              {userInput.speed && <DebugEntry label={t("debug.speed")} value={userInput.speed} />}
              {userInput.negativePrompt && <DebugEntry label={t("debug.negative")} value={userInput.negativePrompt} />}
              {userInput.customInstructions && <DebugEntry label={t("debug.advanced")} value={userInput.customInstructions} />}
              {userInput.marketResearch && <DebugEntry label={t("debug.marketResearch")} value="✓" />}
              {userInput.contentType && <DebugEntry label={t("debug.contentType")} value={userInput.contentType} />}
              {userInput.imageCount && <DebugEntry label={t("debug.imageCount")} value={userInput.imageCount} />}
              {userInput.preferredProvider && <DebugEntry label={t("debug.preferredProvider")} value={userInput.preferredProvider} />}
            </DebugStep>
          )}

          {systemPrompt && (
            <DebugStep number="2" label={t("debug.step2")} color="purple">
              <div className="dbg-entry">
                <span className="dbg-entry-label">{t("debug.systemPrompt")}</span>
                <pre className="dbg-entry-value dbg-pre dbg-system">{systemPrompt}</pre>
                <CopyBtn text={systemPrompt} />
              </div>
            </DebugStep>
          )}

          {requestInfo && (
            <DebugStep number="3" label={t("debug.step3")} color="green">
              {requestInfo.endpoint && <DebugEntry label={t("debug.endpoint")} value={requestInfo.endpoint} />}
              {requestInfo.modelId && <DebugEntry label={t("debug.modelId")} value={requestInfo.modelId} />}
              {requestInfo.temperature && <DebugEntry label={t("debug.temperature")} value={requestInfo.temperature} />}
              {requestInfo.maxTokens && <DebugEntry label={t("debug.maxTokens")} value={requestInfo.maxTokens} />}
              {requestInfo.provider && <DebugEntry label={t("debug.providerUsed")} value={requestInfo.provider} />}
              {requestInfo.extra && <DebugEntry label={t("debug.extra")} value={requestInfo.extra} />}
            </DebugStep>
          )}

          {rawResponse && (
            <DebugStep number="4" label={t("debug.step4")} color="orange">
              <div className="dbg-entry">
                <span className="dbg-entry-label">{t("debug.rawText")}</span>
                <pre className="dbg-entry-value dbg-pre dbg-raw">{rawResponse}</pre>
                <CopyBtn text={rawResponse} />
              </div>
            </DebugStep>
          )}

          {parsedOutput && (
            <DebugStep number="5" label={t("debug.step5")} color="teal">
              {typeof parsedOutput === "string" ? (
                <div className="dbg-entry">
                  <span className="dbg-entry-label">{t("debug.result")}</span>
                  <pre className="dbg-entry-value dbg-pre">{parsedOutput}</pre>
                  <CopyBtn text={parsedOutput} />
                </div>
              ) : (
                <div className="dbg-entry">
                  <span className="dbg-entry-label">{t("debug.result")}</span>
                  <pre className="dbg-entry-value dbg-pre">{JSON.stringify(parsedOutput, null, 2)}</pre>
                  <CopyBtn text={JSON.stringify(parsedOutput, null, 2)} />
                </div>
              )}
            </DebugStep>
          )}
        </div>
      )}
    </div>
  );
}
