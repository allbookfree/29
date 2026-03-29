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

function DebugEntry({ label, value, hint, dot }) {
  if (value === null || value === undefined || value === "") return null;
  const display = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  const isLong = display.length > 120;
  return (
    <div className="dbg-entry">
      {dot && <span className={`dbg-entry-dot dbg-dot-${dot}`} />}
      <span className="dbg-entry-label">{label}</span>
      <div className="dbg-entry-right">
        {isLong ? (
          <pre className="dbg-entry-value dbg-pre">{display}</pre>
        ) : (
          <span className="dbg-entry-value">{display}</span>
        )}
        {hint && <span className="dbg-hint">{hint}</span>}
      </div>
      <CopyBtn text={display} />
    </div>
  );
}

function DebugBlock({ label, value, hint, dot, className = "" }) {
  if (!value) return null;
  return (
    <div className="dbg-entry">
      {dot && <span className={`dbg-entry-dot dbg-dot-${dot}`} />}
      <span className="dbg-entry-label">{label}</span>
      <div className="dbg-entry-right">
        <pre className={`dbg-entry-value dbg-pre ${className}`}>{value}</pre>
        {hint && <span className="dbg-hint">{hint}</span>}
      </div>
      <CopyBtn text={value} />
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
    userMessage,
    requestBody,
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
              <DebugEntry label={t("debug.concept")}           value={userInput.concept}           dot="blue"   hint={t("debug.hintConcept")} />
              <DebugEntry label={t("debug.quantity")}          value={userInput.quantity}           dot="blue"   hint={t("debug.hintQuantity")} />
              <DebugEntry label={t("debug.provider")}          value={userInput.provider}           dot="purple" hint={t("debug.hintProvider")} />
              <DebugEntry label={t("debug.model")}             value={userInput.model}              dot="purple" hint={t("debug.hintModel")} />
              <DebugEntry label={t("debug.type")}              value={userInput.type}               dot="blue"   hint={t("debug.hintType")} />
              <DebugEntry label={t("debug.style")}             value={userInput.style}              dot="teal"   hint={t("debug.hintStyle")} />
              <DebugEntry label={t("debug.mood")}              value={userInput.mood}               dot="teal"   hint={t("debug.hintMood")} />
              <DebugEntry label={t("debug.lighting")}          value={userInput.lighting}           dot="teal"   hint={t("debug.hintLighting")} />
              <DebugEntry label={t("debug.camera")}            value={userInput.camera}             dot="teal"   hint={t("debug.hintCamera")} />
              <DebugEntry label={t("debug.shot")}              value={userInput.shot}               dot="teal"   hint={t("debug.hintShot")} />
              <DebugEntry label={t("debug.speed")}             value={userInput.speed}              dot="teal"   hint={t("debug.hintSpeed")} />
              <DebugEntry label={t("debug.negative")}          value={userInput.negativePrompt}     dot="red"    hint={t("debug.hintNegative")} />
              <DebugEntry label={t("debug.advanced")}          value={userInput.customInstructions} dot="orange" hint={t("debug.hintAdvanced")} />
              {userInput.marketResearch && <DebugEntry label={t("debug.marketResearch")} value="ON" dot="green" hint={t("debug.hintMarketResearch")} />}
              <DebugEntry label={t("debug.contentType")}       value={userInput.contentType}        dot="blue"   hint={t("debug.hintContentType")} />
              <DebugEntry label={t("debug.imageCount")}        value={userInput.imageCount}         dot="blue"   hint={t("debug.hintImageCount")} />
              <DebugEntry label={t("debug.preferredProvider")} value={userInput.preferredProvider}  dot="purple" hint={t("debug.hintPreferredProvider")} />
            </DebugStep>
          )}

          {systemPrompt && (
            <DebugStep number="2" label={t("debug.step2")} color="purple" defaultOpen={false}>
              <DebugBlock
                label={t("debug.systemPrompt")}
                value={systemPrompt}
                className="dbg-system"
                dot="purple"
                hint={t("debug.hintSystemPrompt")}
              />
            </DebugStep>
          )}

          {(requestInfo || userMessage || requestBody) && (
            <DebugStep number="3" label={t("debug.step3")} color="green" defaultOpen={false}>
              {requestInfo && (
                <>
                  <DebugEntry label={t("debug.providerName")}  value={requestInfo.providerName}    dot="green"  hint={t("debug.hintProviderName")} />
                  <DebugEntry label={t("debug.httpMethod")}    value="POST"                         dot="green"  hint={t("debug.hintHttpMethod")} />
                  <DebugEntry label={t("debug.endpoint")}      value={requestInfo.endpoint ? `https://${requestInfo.endpoint}` : undefined} dot="green" hint={t("debug.hintEndpoint")} />
                  <DebugEntry label={t("debug.requestFormat")} value={requestInfo.requestFormat}    dot="teal"   hint={t("debug.hintRequestFormat")} />
                  <DebugEntry label={t("debug.modelId")}       value={requestInfo.modelId}          dot="purple" hint={t("debug.hintModelId")} />
                  <DebugEntry label={t("debug.temperature")}   value={requestInfo.temperature}      dot="orange" hint={t("debug.hintTemperature")} />
                  <DebugEntry label={t("debug.maxTokens")}     value={requestInfo.maxTokens}        dot="orange" hint={t("debug.hintMaxTokens")} />
                  <DebugEntry label={t("debug.extra")}         value={requestInfo.extra}            dot="teal"   hint={t("debug.hintExtra")} />
                </>
              )}
              {userMessage && (
                <DebugBlock
                  label={t("debug.userMessage")}
                  value={userMessage}
                  dot="blue"
                  hint={t("debug.hintUserMessage")}
                />
              )}
              {requestBody && (
                <DebugBlock
                  label={t("debug.requestBody")}
                  value={requestBody}
                  dot="green"
                  hint={t("debug.hintRequestBody")}
                />
              )}
            </DebugStep>
          )}

          {rawResponse && (
            <DebugStep number="4" label={t("debug.step4")} color="orange" defaultOpen={false}>
              {requestInfo?.responseStatus && (
                <DebugEntry label={t("debug.responseStatus")} value={requestInfo.responseStatus} dot="green" hint={t("debug.hintResponseStatus")} />
              )}
              {requestInfo?.responseModel && (
                <DebugEntry label={t("debug.responseModel")} value={requestInfo.responseModel} dot="purple" hint={t("debug.hintResponseModel")} />
              )}
              <DebugBlock
                label={t("debug.rawText")}
                value={rawResponse}
                className="dbg-raw"
                dot="orange"
                hint={t("debug.hintRawText")}
              />
            </DebugStep>
          )}

          {parsedOutput && (
            <DebugStep number="5" label={t("debug.step5")} color="teal" defaultOpen={false}>
              <DebugBlock
                label={t("debug.result")}
                value={typeof parsedOutput === "string" ? parsedOutput : JSON.stringify(parsedOutput, null, 2)}
                dot="teal"
                hint={t("debug.hintResult")}
              />
            </DebugStep>
          )}

        </div>
      )}
    </div>
  );
}
