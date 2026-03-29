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
              <DebugEntry label={t("debug.concept")}           value={userInput.concept}           dot="blue"   hint="তুমি যা লিখেছিলে — AI এটি মূল বিষয় হিসেবে ব্যবহার করবে" />
              <DebugEntry label={t("debug.quantity")}          value={userInput.quantity}           dot="blue"   hint="কতটি prompt তৈরি করতে বলা হয়েছে" />
              <DebugEntry label={t("debug.provider")}          value={userInput.provider}           dot="purple" hint="কোন AI provider সিলেক্ট করা হয়েছে (Gemini, Groq, ইত্যাদি)" />
              <DebugEntry label={t("debug.model")}             value={userInput.model}              dot="purple" hint="API তে পাঠানো model এর identifier" />
              <DebugEntry label={t("debug.type")}              value={userInput.type}               dot="blue"   hint="কোন ধরনের prompt চাওয়া হচ্ছে: image, vector, বা video" />
              <DebugEntry label={t("debug.style")}             value={userInput.style}              dot="teal"   hint="Visual style — system prompt এ যোগ হয়" />
              <DebugEntry label={t("debug.mood")}              value={userInput.mood}               dot="teal"   hint="Mood/atmosphere — system prompt এ যোগ হয়" />
              <DebugEntry label={t("debug.lighting")}          value={userInput.lighting}           dot="teal"   hint="Lighting condition — system prompt এ যোগ হয়" />
              <DebugEntry label={t("debug.camera")}            value={userInput.camera}             dot="teal"   hint="Camera movement — video prompt এ ব্যবহার হয়" />
              <DebugEntry label={t("debug.shot")}              value={userInput.shot}               dot="teal"   hint="Shot type — video prompt এ ব্যবহার হয়" />
              <DebugEntry label={t("debug.speed")}             value={userInput.speed}              dot="teal"   hint="Pacing/speed — video prompt এ ব্যবহার হয়" />
              <DebugEntry label={t("debug.negative")}          value={userInput.negativePrompt}     dot="red"    hint="এগুলো exclude করতে বলা হয়েছে — system prompt এ 'Exclude from all prompts' হিসেবে যোগ হয়" />
              <DebugEntry label={t("debug.advanced")}          value={userInput.customInstructions} dot="orange" hint="তোমার custom নির্দেশনা — এটি সম্পূর্ণ system prompt override করে" />
              {userInput.marketResearch && <DebugEntry label={t("debug.marketResearch")} value="✓ ON" dot="green" hint="Market Research mode: AI প্রথমে Google Search করে trending topics দেখে" />}
              <DebugEntry label={t("debug.contentType")}       value={userInput.contentType}        dot="blue"   hint="Metadata generator: image/vector/video এর জন্য ভিন্ন system prompt" />
              <DebugEntry label={t("debug.imageCount")}        value={userInput.imageCount}         dot="blue"   hint="একসাথে কতটি ছবির metadata তৈরি হবে" />
              <DebugEntry label={t("debug.preferredProvider")} value={userInput.preferredProvider}  dot="purple" hint="Metadata generator এ manual provider selection" />
            </DebugStep>
          )}

          {systemPrompt && (
            <DebugStep number="2" label={t("debug.step2")} color="purple" defaultOpen={false}>
              <DebugBlock
                label={t("debug.systemPrompt")}
                value={systemPrompt}
                className="dbg-system"
                dot="purple"
                hint="এটি AI এর 'personality' এবং rules। প্রতিটি request এ এই text সবার আগে পাঠানো হয়। AI এর behavior এবং output format এটিই নির্ধারণ করে।"
              />
            </DebugStep>
          )}

          {(requestInfo || userMessage || requestBody) && (
            <DebugStep number="3" label={t("debug.step3")} color="green" defaultOpen={false}>
              {requestInfo && (
                <>
                  <DebugEntry label={t("debug.providerName")}  value={requestInfo.providerName}    dot="green"  hint="যে AI কোম্পানির server এ request যাচ্ছে" />
                  <DebugEntry label={t("debug.httpMethod")}    value="POST"                         dot="green"  hint="POST মানে data request body তে পাঠানো হয় (GET এর মতো URL এ নয়)" />
                  <DebugEntry label={t("debug.endpoint")}      value={requestInfo.endpoint ? `https://${requestInfo.endpoint}` : undefined} dot="green" hint="যে server URL এ request পাঠানো হচ্ছে — এটিই AI এর 'দরজা'" />
                  <DebugEntry label={t("debug.requestFormat")} value={requestInfo.requestFormat}    dot="teal"   hint="JSON body এর structure: Gemini ও OpenAI এর format আলাদা" />
                  <DebugEntry label={t("debug.modelId")}       value={requestInfo.modelId}          dot="purple" hint="API তে পাঠানো exact model নাম — এটি AI এর version নির্ধারণ করে" />
                  <DebugEntry label={t("debug.temperature")}   value={requestInfo.temperature}      dot="orange" hint="সৃজনশীলতার মাত্রা: 0=নিখুঁত/পুনরাবৃত্তিযোগ্য, 1=সুষম, 2=এলোমেলো/সৃজনশীল" />
                  <DebugEntry label={t("debug.maxTokens")}     value={requestInfo.maxTokens}        dot="orange" hint="AI response এর সর্বোচ্চ দৈর্ঘ্য। 8192 token ≈ প্রায় 6000 শব্দ" />
                  <DebugEntry label={t("debug.extra")}         value={requestInfo.extra}            dot="teal"   hint="Provider-specific বাড়তি settings" />
                </>
              )}
              {userMessage && (
                <DebugBlock
                  label={t("debug.userMessage")}
                  value={userMessage}
                  dot="blue"
                  hint="System prompt এর পরে AI কে পাঠানো actual message। এতে তোমার concept + random diversity seed + আগে generate হওয়া prompts থাকে।"
                />
              )}
              {requestBody && (
                <DebugBlock
                  label={t("debug.requestBody")}
                  value={requestBody}
                  dot="green"
                  hint="API তে পাঠানো সম্পূর্ণ JSON body — ঠিক এই format এ HTTP POST request হয়"
                />
              )}
            </DebugStep>
          )}

          {rawResponse && (
            <DebugStep number="4" label={t("debug.step4")} color="orange" defaultOpen={false}>
              {requestInfo?.responseStatus && (
                <DebugEntry label={t("debug.responseStatus")} value={requestInfo.responseStatus} dot="green" hint="HTTP status code: 200=সফল, 429=rate limit, 401=invalid key, 500=server error" />
              )}
              {requestInfo?.responseModel && (
                <DebugEntry label={t("debug.responseModel")} value={requestInfo.responseModel} dot="purple" hint="AI যে actual model use করেছে (X-Model-Used header থেকে)" />
              )}
              <DebugBlock
                label={t("debug.rawText")}
                value={rawResponse}
                className="dbg-raw"
                dot="orange"
                hint="AI এর unprocessed raw output — parse করার আগে ঠিক যেভাবে response এসেছে"
              />
            </DebugStep>
          )}

          {parsedOutput && (
            <DebugStep number="5" label={t("debug.step5")} color="teal" defaultOpen={false}>
              <DebugBlock
                label={t("debug.result")}
                value={typeof parsedOutput === "string" ? parsedOutput : JSON.stringify(parsedOutput, null, 2)}
                dot="teal"
                hint="Raw response থেকে extract করা final output — numbered format থেকে individual prompts আলাদা করা হয়"
              />
            </DebugStep>
          )}

        </div>
      )}
    </div>
  );
}
