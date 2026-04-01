import { METADATA_PROMPTS } from "@/lib/metadataPrompts";
import { jsonError, sanitizeKeys, fetchWithTimeout } from "@/lib/apiUtils";

const PROMPTS = METADATA_PROMPTS;

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 90000;
const MAX_TITLE_CHARS = 70;
const MAX_DESCRIPTION_CHARS = 250;
const MAX_KEYWORDS = 49;
const MIN_QUALITY_KEYWORDS = 25;

const BANNED_KEYWORDS_COMMON = new Set([
  "photo", "image", "stock", "picture", "photograph", "photography",
  "stock photo", "stock image", "royalty free", "royalty-free",
  "clip art", "clipart", "ai generated", "ai-generated",
  "high quality", "high-quality", "high resolution", "high-resolution",
  "hd", "4k", "8k", "beautiful", "nice", "good",
  "amazing", "stunning", "gorgeous", "wonderful", "awesome", "best",
]);

const BANNED_KEYWORDS_VECTOR = new Set([
  ...BANNED_KEYWORDS_COMMON,
  "vector", "illustration", "graphic design", "design element",
  "stock vector", "stock illustration", "eps", "svg", "artwork",
]);

const BANNED_KEYWORDS_IMAGE = new Set([
  ...BANNED_KEYWORDS_COMMON,
  "stock photo", "stock photography", "digital art", "artwork",
]);

function estimateBase64Bytes(base64Data) {
  const padding = (base64Data.match(/=+$/) || [""])[0].length;
  return Math.floor((base64Data.length * 3) / 4) - padding;
}

function smartTruncateTitle(title, maxLen) {
  if (title.length <= maxLen) return title;
  const truncated = title.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) {
    let result = truncated.slice(0, lastSpace).trim();
    result = result.replace(/[,\-–—:;|/\\]+$/, "").trim();
    return result;
  }
  return truncated.trim();
}

function isBannedKeyword(keyword, bannedSet) {
  const norm = keyword.toLowerCase().trim()
    .replace(/[.,;:!?'"]+$/, "")
    .replace(/^[.,;:!?'"]+/, "");
  if (bannedSet.has(norm)) return true;
  const noDash = norm.replace(/-/g, " ");
  if (noDash !== norm && bannedSet.has(noDash)) return true;
  if (norm.endsWith("s") && bannedSet.has(norm.slice(0, -1))) return true;
  return false;
}

function normalizeKeywords(input, contentType = "image") {
  const bannedSet = contentType === "vector" ? BANNED_KEYWORDS_VECTOR : BANNED_KEYWORDS_IMAGE;
  const raw = typeof input === "string" ? input : Array.isArray(input) ? input.join(", ") : "";
  const list = raw
    .split(",")
    .map((item) => item.trim().replace(/^\d+\.\s*/, ""))
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  for (const key of list) {
    const normalized = key.toLowerCase().trim();
    if (seen.has(normalized)) continue;
    if (isBannedKeyword(key, bannedSet)) continue;
    seen.add(normalized);
    unique.push(key);
    if (unique.length >= MAX_KEYWORDS) break;
  }
  return unique;
}

function normalizeMetadata(metadata, contentType = "image") {
  const titleRaw = typeof metadata?.title === "string" ? metadata.title.trim() : "";
  const descriptionRaw = typeof metadata?.description === "string" ? metadata.description.trim() : "";
  const keywordsList = normalizeKeywords(metadata?.keywords, contentType);
  const title = smartTruncateTitle(titleRaw, MAX_TITLE_CHARS);
  const description = descriptionRaw.slice(0, MAX_DESCRIPTION_CHARS);
  const keywords = keywordsList.join(", ");
  const keywordCount = keywordsList.length;
  const hasMinimumContent = title.length > 0 && description.length > 0 && keywordsList.length >= 10;
  return { title, description, keywords, keywordCount, hasMinimumContent };
}

function parseJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  }
}

// ── Gemini (Flash or Flash-Lite) ──────────────────────────────────────────────
async function tryGemini(geminiKeys, mimeType, base64Data, prompt, model, contentType = "image") {
  const effectiveMime = mimeType === "image/svg+xml" ? "image/png" : mimeType;
  for (const apiKey of geminiKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: effectiveMime, data: base64Data } },
              ],
            },
          ],
          generationConfig: { temperature: 0.4, topP: 0.8, maxOutputTokens: 1024 },
        }),
      }, REQUEST_TIMEOUT_MS);

      if (res.status === 429) {
        let errMsg = "";
        try { const e = await res.json(); errMsg = e?.error?.message || ""; } catch {}
        console.error(`[Gemini Metadata] ${model} → 429: ${errMsg || "Rate limited"}`);
        continue; // try next key
      }
      if (!res.ok) {
        let errMsg = `Gemini error (${res.status})`;
        try { const e = await res.json(); if (e?.error?.message) errMsg = e.error.message; } catch {}
        console.error(`[Gemini Metadata] ${model} → ${res.status}: ${errMsg}`);
        return { error: errMsg, retry: false };
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const metadata = parseJsonResponse(rawText);
      if (!metadata) continue;

      const normalized = normalizeMetadata(metadata, contentType);
      if (normalized.hasMinimumContent) return { ok: true, data: normalized, provider: model };
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("timeout") || msg.includes("aborted")) continue;
    }
  }
  return { error: null, retry: true }; // all keys failed/rate-limited, try next provider
}

// ── OpenRouter (dynamic free vision model discovery) ──────────────────────────
// Fallback list only — actual models fetched dynamically from the API
const OR_FALLBACK_MODELS = [
  "openrouter/free",
  "google/gemma-3-27b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-3-12b-it:free",
  "google/gemma-3-4b-it:free",
];

const _orModelCache = new Map(); // key → { models, ts }
const OR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getFreeVisionModels(apiKey) {
  const cached = _orModelCache.get(apiKey);
  if (cached && Date.now() - cached.ts < OR_CACHE_TTL_MS) return cached.models;

  try {
    const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 10000);
    if (!res.ok) return OR_FALLBACK_MODELS;

    const json = await res.json();
    const models = (json.data || [])
      .filter(m => {
        const free = m.id?.endsWith(":free") || Number(m.pricing?.prompt) === 0;
        const modality = (m.architecture?.modality || m.architecture?.input_modalities || []);
        const vision = (typeof modality === "string" ? modality : modality.join(","))
          .toLowerCase().includes("image");
        return free && vision;
      })
      // prefer smaller/faster models first
      .sort((a, b) => {
        const sizeA = (a.id?.match(/(\d+)b/i) || [, 999])[1];
        const sizeB = (b.id?.match(/(\d+)b/i) || [, 999])[1];
        return Number(sizeA) - Number(sizeB);
      })
      .map(m => m.id)
      .slice(0, 6);

    const result = models.length > 0 ? models : OR_FALLBACK_MODELS;
    _orModelCache.set(apiKey, { models: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error("[OpenRouter] Model discovery failed:", err?.message);
    return OR_FALLBACK_MODELS;
  }
}

async function tryOpenRouter(orKeys, mimeType, base64Data, prompt, contentType = "image") {
  const effectiveMime = mimeType === "image/svg+xml" ? "image/png" : mimeType;
  const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
  let lastErr = "";

  for (const apiKey of orKeys) {
    const models = await getFreeVisionModels(apiKey);
    for (const model of models) {
      try {
        const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://ai-prompt-studio.replit.app",
            "X-Title": "AI Prompt Studio",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            temperature: 0.4,
            max_tokens: 1024,
          }),
        }, REQUEST_TIMEOUT_MS);

        if (!res.ok) {
          let errBody = "";
          try { errBody = await res.text(); } catch {}
          let parsed = null;
          try { parsed = JSON.parse(errBody); } catch {}
          const apiMsg = parsed?.error?.message || parsed?.message || errBody || `HTTP ${res.status}`;
          console.error(`[OpenRouter] ${model} → ${res.status}: ${apiMsg}`);

          if (res.status === 401 || res.status === 403) {
            return { error: `OpenRouter key invalid (${res.status}). Check your key in Settings.`, retry: false };
          }
          if (res.status === 402) {
            return { error: "OpenRouter free credits exhausted. Add credits or use another provider.", retry: false };
          }
          if (res.status === 429) { lastErr = "Rate limit"; continue; }
          // 400 or other: capture error and try next model
          lastErr = apiMsg.slice(0, 120);
          continue;
        }

        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content || "";
        const metadata = parseJsonResponse(rawText);
        if (!metadata) { lastErr = "No valid JSON in response"; continue; }

        const normalized = normalizeMetadata(metadata, contentType);
        if (normalized.hasMinimumContent) {
          return { ok: true, data: normalized, provider: `openrouter:${model.split("/")[1].split(":")[0]}` };
        }
        lastErr = "Incomplete metadata returned";
      } catch (err) {
        const msg = String(err?.message || "");
        console.error(`[OpenRouter] ${model} exception:`, msg);
        if (msg.includes("timeout") || msg.includes("aborted")) { lastErr = "Timeout"; continue; }
        lastErr = msg.slice(0, 80);
      }
    }
  }
  return { error: lastErr ? `OpenRouter: ${lastErr}` : null, retry: false };
}

// ── Groq Scout (vision) ───────────────────────────────────────────────────────
async function tryGroq(groqKeys, mimeType, base64Data, prompt, contentType = "image") {
  const dataUrl = `data:${mimeType === "image/svg+xml" ? "image/png" : mimeType};base64,${base64Data}`;
  for (const apiKey of groqKeys) {
    try {
      const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          temperature: 0.4,
          max_tokens: 1024,
        }),
      }, REQUEST_TIMEOUT_MS);

      if (res.status === 429) continue;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { error: `Groq auth error (${res.status}) — check your key.`, retry: false };
        }
        // 400 often means image too large/unsupported — skip, don't stop chain
        continue;
      }

      const data = await res.json();
      const rawText = data?.choices?.[0]?.message?.content || "";
      const metadata = parseJsonResponse(rawText);
      if (!metadata) continue;

      const normalized = normalizeMetadata(metadata, contentType);
      if (normalized.hasMinimumContent) return { ok: true, data: normalized, provider: "groq-scout" };
    } catch (err) {
      const msg = String(err?.message || "");
      if (msg.includes("timeout") || msg.includes("aborted")) continue;
    }
  }
  return { error: null, retry: false };
}

// ── Mistral Pixtral (vision) ──────────────────────────────────────────────────
const PIXTRAL_MODELS = ["pixtral-12b-2409", "pixtral-large-latest"];

async function tryMistral(mistralKeys, mimeType, base64Data, prompt, contentType = "image") {
  const effectiveMime = mimeType === "image/svg+xml" ? "image/png" : mimeType;
  const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
  let lastErr = "";

  for (const apiKey of mistralKeys) {
    for (const model of PIXTRAL_MODELS) {
      try {
        const res = await fetchWithTimeout("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            temperature: 0.4,
            max_tokens: 1024,
          }),
        }, REQUEST_TIMEOUT_MS);

        if (!res.ok) {
          let errBody = "";
          try { errBody = await res.text(); } catch {}
          let parsed = null;
          try { parsed = JSON.parse(errBody); } catch {}
          const apiMsg = parsed?.message || parsed?.error?.message || errBody || `HTTP ${res.status}`;
          console.error(`[Mistral] ${model} → ${res.status}: ${apiMsg}`);

          if (res.status === 401 || res.status === 403) {
            return { error: `Mistral key invalid (${res.status}). Check your key in Settings.`, retry: false };
          }
          if (res.status === 429) { lastErr = "Rate limit"; continue; }
          lastErr = (typeof apiMsg === "string" ? apiMsg : String(apiMsg)).slice(0, 120);
          continue;
        }

        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content || "";
        const metadata = parseJsonResponse(rawText);
        if (!metadata) { lastErr = "No valid JSON in response"; continue; }

        const normalized = normalizeMetadata(metadata, contentType);
        if (normalized.hasMinimumContent) {
          return { ok: true, data: normalized, provider: `pixtral-${model.includes("large") ? "large" : "12b"}` };
        }
        lastErr = "Incomplete metadata returned";
      } catch (err) {
        const msg = String(err?.message || "");
        console.error(`[Mistral] ${model} exception:`, msg);
        if (msg.includes("timeout") || msg.includes("aborted")) { lastErr = "Timeout"; continue; }
        lastErr = msg.slice(0, 80);
      }
    }
  }
  return { error: lastErr ? `Mistral: ${lastErr}` : null, retry: false };
}

const HF_VISION_MODELS = [
  "Qwen/Qwen2.5-VL-72B-Instruct",
  "meta-llama/Llama-3.2-11B-Vision-Instruct",
];

async function tryHuggingFace(hfKeys, mimeType, base64Data, prompt, contentType = "image") {
  const effectiveMime = mimeType === "image/svg+xml" ? "image/png" : mimeType;
  const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
  let lastErr = "";

  for (const apiKey of hfKeys) {
    for (const model of HF_VISION_MODELS) {
      try {
        const res = await fetchWithTimeout("https://router.huggingface.co/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            temperature: 0.4,
            max_tokens: 1024,
          }),
        }, REQUEST_TIMEOUT_MS);

        if (!res.ok) {
          let errBody = "";
          try { errBody = await res.text(); } catch {}
          let parsed = null;
          try { parsed = JSON.parse(errBody); } catch {}
          const apiMsg = parsed?.error?.message || parsed?.error || errBody || `HTTP ${res.status}`;
          console.error(`[HuggingFace] ${model} → ${res.status}: ${apiMsg}`);

          if (res.status === 401 || res.status === 403) {
            return { error: `HuggingFace token invalid (${res.status}). Check your token in Settings.`, retry: false };
          }
          if (res.status === 402) {
            return { error: "HuggingFace free credits exhausted.", retry: false };
          }
          if (res.status === 429) { lastErr = "Rate limit"; continue; }
          lastErr = (typeof apiMsg === "string" ? apiMsg : String(apiMsg)).slice(0, 120);
          continue;
        }

        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content || "";
        const metadata = parseJsonResponse(rawText);
        if (!metadata) { lastErr = "No valid JSON in response"; continue; }

        const normalized = normalizeMetadata(metadata, contentType);
        if (normalized.hasMinimumContent) {
          const shortName = model.split("/")[1] || model;
          return { ok: true, data: normalized, provider: `hf:${shortName}` };
        }
        lastErr = "Incomplete metadata returned";
      } catch (err) {
        const msg = String(err?.message || "");
        console.error(`[HuggingFace] ${model} exception:`, msg);
        if (msg.includes("timeout") || msg.includes("aborted")) { lastErr = "Timeout"; continue; }
        lastErr = msg.slice(0, 80);
      }
    }
  }
  return { error: lastErr ? `HuggingFace: ${lastErr}` : null, retry: false };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { image, apiKeys, groqKeys: rawGroqKeys, mistralKeys: rawMistralKeys, orKeys: rawOrKeys, hfKeys: rawHfKeys, preferredProvider, contentType = "image" } = body;

    const geminiKeys = sanitizeKeys(apiKeys);
    const groqKeys = sanitizeKeys(rawGroqKeys);
    const mistralKeys = sanitizeKeys(rawMistralKeys);
    const orKeys = sanitizeKeys(rawOrKeys);
    const hfKeys = sanitizeKeys(rawHfKeys);

    if (geminiKeys.length === 0 && groqKeys.length === 0 && mistralKeys.length === 0 && orKeys.length === 0 && hfKeys.length === 0) {
      return jsonError("No API keys found. Add Gemini, Groq, Mistral, OpenRouter, or HuggingFace keys in Settings.", 400, "VALIDATION_API_KEYS");
    }

    if (!image || typeof image !== "string") {
      return jsonError("Upload an image first.", 400, "VALIDATION_IMAGE_REQUIRED");
    }

    const match = image.match(/^data:(image\/[\w+]+);base64,(.+)$/);
    if (!match) {
      return jsonError("Invalid image format. Use PNG, JPG, or WEBP.", 400, "VALIDATION_IMAGE_FORMAT");
    }

    const [mimeType, base64Data] = [match[1].toLowerCase(), match[2]];
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return jsonError("Invalid image format. Use PNG, JPG, WEBP, or SVG.", 400, "VALIDATION_IMAGE_MIME");
    }
    if (estimateBase64Bytes(base64Data) > MAX_IMAGE_BYTES) {
      return jsonError("Image too large. Use a file under 10MB.", 413, "VALIDATION_IMAGE_SIZE");
    }

    const prompt = PROMPTS[contentType] || PROMPTS.image;

    // If user picked a specific provider, only try that one
    if (preferredProvider === "gemini" || preferredProvider === "gemini-2.5-flash" || preferredProvider === "gemini-2.5-flash-lite") {
      if (!geminiKeys.length) return jsonError("No Gemini keys configured.", 400, "NO_KEYS");
      // If a specific model was chosen, try only that model; otherwise try both
      const modelsToTry = (preferredProvider === "gemini-2.5-flash" || preferredProvider === "gemini-2.5-flash-lite")
        ? [preferredProvider]
        : ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
      for (const model of modelsToTry) {
        const r = await tryGemini(geminiKeys, mimeType, base64Data, prompt, model, contentType);
        if (r.ok) return Response.json({ ...r.data, provider: r.provider });
        if (!r.retry && r.error) return jsonError(r.error, 502, "PROVIDER_ERROR");
      }
      return jsonError("Gemini rate-limited. Try again later or switch provider.", 429, "PROVIDER_RATE_LIMITED");
    }

    if (preferredProvider === "groq") {
      if (!groqKeys.length) return jsonError("No Groq keys configured.", 400, "NO_KEYS");
      const r = await tryGroq(groqKeys, mimeType, base64Data, prompt, contentType);
      if (r.ok) return Response.json({ ...r.data, provider: r.provider });
      return jsonError(r.error || "Groq failed. Try another provider.", 502, "PROVIDER_ERROR");
    }

    if (preferredProvider === "mistral") {
      if (!mistralKeys.length) return jsonError("No Mistral keys configured.", 400, "NO_KEYS");
      const r = await tryMistral(mistralKeys, mimeType, base64Data, prompt, contentType);
      if (r.ok) return Response.json({ ...r.data, provider: r.provider });
      return jsonError(r.error || "Mistral Pixtral failed. Try another provider.", 502, "PROVIDER_ERROR");
    }

    if (preferredProvider === "openrouter") {
      if (!orKeys.length) return jsonError("No OpenRouter keys configured.", 400, "NO_KEYS");
      const r = await tryOpenRouter(orKeys, mimeType, base64Data, prompt, contentType);
      if (r.ok) return Response.json({ ...r.data, provider: r.provider });
      return jsonError(r.error || "OpenRouter failed. Try another provider.", 502, "PROVIDER_ERROR");
    }

    if (preferredProvider === "huggingface") {
      if (!hfKeys.length) return jsonError("No HuggingFace keys configured.", 400, "NO_KEYS");
      const r = await tryHuggingFace(hfKeys, mimeType, base64Data, prompt, contentType);
      if (r.ok) return Response.json({ ...r.data, provider: r.provider });
      return jsonError(r.error || "HuggingFace failed. Try another provider.", 502, "PROVIDER_ERROR");
    }

    // Auto mode: try all in order
    // 1. Gemini Flash
    if (geminiKeys.length > 0) {
      const result = await tryGemini(geminiKeys, mimeType, base64Data, prompt, "gemini-2.5-flash", contentType);
      if (result.ok) return Response.json({ ...result.data, provider: result.provider });
      if (!result.retry && result.error) return jsonError(result.error, 502, "PROVIDER_ERROR");
    }

    // 2. Gemini Flash-Lite (same keys, higher rate limit)
    if (geminiKeys.length > 0) {
      const result = await tryGemini(geminiKeys, mimeType, base64Data, prompt, "gemini-2.5-flash-lite", contentType);
      if (result.ok) return Response.json({ ...result.data, provider: result.provider });
      if (!result.retry && result.error) return jsonError(result.error, 502, "PROVIDER_ERROR");
    }

    // 3. Groq Scout (vision)
    if (groqKeys.length > 0) {
      const result = await tryGroq(groqKeys, mimeType, base64Data, prompt, contentType);
      if (result.ok) return Response.json({ ...result.data, provider: result.provider });
      if (result.error) return jsonError(result.error, 502, "PROVIDER_ERROR");
    }

    // 4. Mistral Pixtral (vision)
    if (mistralKeys.length > 0) {
      const result = await tryMistral(mistralKeys, mimeType, base64Data, prompt, contentType);
      if (result.ok) return Response.json({ ...result.data, provider: result.provider });
      if (result.error) return jsonError(result.error, 502, "PROVIDER_ERROR");
    }

    // 5. OpenRouter (free vision models)
    if (orKeys.length > 0) {
      const result = await tryOpenRouter(orKeys, mimeType, base64Data, prompt, contentType);
      if (result.ok) return Response.json({ ...result.data, provider: result.provider });
      if (result.error) return jsonError(result.error, 502, "PROVIDER_ERROR");
    }

    // 6. HuggingFace (vision models)
    if (hfKeys.length > 0) {
      const result = await tryHuggingFace(hfKeys, mimeType, base64Data, prompt, contentType);
      if (result.ok) return Response.json({ ...result.data, provider: result.provider });
      if (result.error) return jsonError(result.error, 502, "PROVIDER_ERROR");
    }

    // All providers exhausted
    const providers = [];
    if (geminiKeys.length > 0) providers.push("Gemini");
    if (groqKeys.length > 0) providers.push("Groq");
    if (mistralKeys.length > 0) providers.push("Mistral");
    if (orKeys.length > 0) providers.push("OpenRouter");
    if (hfKeys.length > 0) providers.push("HuggingFace");
    return jsonError(
      `All providers rate-limited (${providers.join(", ")}). Add more keys or wait a moment.`,
      429,
      "ALL_PROVIDERS_FAILED"
    );
  } catch {
    return jsonError("Something went wrong.", 500, "INTERNAL_ERROR");
  }
}
