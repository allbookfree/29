import { MODEL_IDS, PROVIDER_KEY_MAP, ALLOWED_MODELS, ALLOWED_TYPES } from "@/config/models";
import { buildSystemPrompt } from "@/lib/promptBuilder";

const MAX_PROMPT_CHARS = 4000;
const MAX_API_KEYS = 10;
const REQUEST_TIMEOUT_MS = 60000;

const DIVERSITY_POOLS = {
  era: ["ancient civilizations", "medieval period", "Renaissance", "Victorian era", "1920s Art Deco", "1960s retro", "1980s neon", "Cold War era", "cyberpunk future", "far future space age", "post-apocalyptic", "prehistoric", "steampunk industrial", "Edo period Japan", "Ming dynasty China", "Ottoman empire"],
  region: ["Japanese countryside", "Scandinavian fjords", "Moroccan medina", "African savanna", "Amazon rainforest", "Arctic tundra", "Mediterranean coast", "Southeast Asian jungle", "Himalayan peaks", "Caribbean island", "Patagonian wilderness", "Saharan desert", "Scottish highlands", "New Zealand coast", "Peruvian mountains", "Icelandic lava fields"],
  mood: ["melancholic and lonely", "joyful and energetic", "serene and peaceful", "dark and ominous", "playful and whimsical", "romantic and intimate", "surreal and dreamlike", "mysterious and eerie", "epic and powerful", "nostalgic and warm", "tense and dramatic", "ethereal and otherworldly"],
  style: ["hyper-realistic photography", "abstract expressionism", "minimalist design", "baroque maximalism", "film noir", "impressionist painting", "pop art", "dark gothic", "painterly fine art", "macro close-up", "long exposure light trails", "infrared photography", "watercolor illustration", "woodblock print", "stained glass", "neon glow art"],
  lighting: ["golden hour sunrise", "blue hour twilight", "harsh midday sun", "moody overcast", "dramatic stormy sky", "soft foggy morning", "starlit night", "candlelight glow", "neon city lights", "bioluminescent glow", "lightning strike", "underwater caustics", "firelight warmth", "aurora borealis"],
  subject: ["solitary human figure", "crowd of people", "wild animals", "architecture ruins", "futuristic technology", "natural phenomenon", "still life objects", "celestial bodies", "microscopic world", "underwater scene", "aerial bird's eye view", "street life", "fantasy creatures", "industrial machinery"],
};

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function buildDiverseUserPrompt(concept) {
  const seed = Math.floor(Math.random() * 999983);
  const era = pickRandom(DIVERSITY_POOLS.era, 2).join(" or ");
  const region = pickRandom(DIVERSITY_POOLS.region, 2).join(" or ");
  const mood = pickRandom(DIVERSITY_POOLS.mood, 2).join(", ");
  const style = pickRandom(DIVERSITY_POOLS.style, 2).join(" or ");
  const lighting = pickRandom(DIVERSITY_POOLS.lighting, 2).join(" or ");
  const subject = pickRandom(DIVERSITY_POOLS.subject, 2).join(" or ");

  return `[Seed: ${seed}]

Topic: ${concept}

Creative diversity angles to draw inspiration from (interpret freely, not literally — mix, combine, subvert, or ignore any of these to maximize variety and surprise):
- Era/time: ${era}
- Region/culture: ${region}
- Mood/atmosphere: ${mood}
- Visual style: ${style}
- Lighting: ${lighting}
- Subject variation: ${subject}

Generate prompts that feel completely fresh and unexpected. Each prompt should explore a DIFFERENT combination of these dimensions.`;
}

const ALLOWED_MODELS_SET = new Set(ALLOWED_MODELS);
const ALLOWED_TYPES_SET = new Set(ALLOWED_TYPES);

class AppError extends Error {
  constructor(message, status = 500, code = "UNKNOWN_ERROR") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

function shortenError(msg) {
  if (!msg) return "Request failed.";
  const lower = msg.toLowerCase();
  if (lower.includes("quota")) return "Quota exceeded. Try another key.";
  if (lower.includes("rate limit")) return "Rate limit hit. Please retry.";
  if (lower.includes("invalid") || lower.includes("unauthorized")) return "Invalid API key.";
  if (lower.includes("timeout") || lower.includes("aborted")) return "Provider timeout. Try again.";
  if (lower.includes("context") && lower.includes("length")) return "Input too long. Reduce prompt or quantity.";
  if (lower.includes("not found") || lower.includes("does not exist")) return "Model not found. Check API access.";
  if (lower.includes("model") && lower.includes("access")) return "Model not accessible with this key.";
  if (lower.includes("limit")) return "Limit reached. Try another key.";
  return "Provider request failed.";
}

function jsonError(message, status, code) {
  return Response.json({ error: message, code }, { status });
}

function createTextResponse(text, modelUsed) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Model-Used": modelUsed,
    },
  });
}

function sanitizeKeys(apiKeys) {
  if (!Array.isArray(apiKeys)) return [];
  const deduped = new Set();
  for (const key of apiKeys) {
    const normalized = typeof key === "string" ? key.trim() : "";
    if (!normalized || normalized.length > 256) continue;
    deduped.add(normalized);
    if (deduped.size >= MAX_API_KEYS) break;
  }
  return [...deduped];
}

function validateRequest(body) {
  if (!body || typeof body !== "object") return "Invalid request payload.";

  const concept = typeof body.concept === "string" ? body.concept.trim() : "";
  const quantity = Number(body.quantity);
  const model = typeof body.model === "string" ? body.model.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim() : "image";
  const validKeys = sanitizeKeys(body.apiKeys);
  const apiKeysByModel = body.apiKeysByModel && typeof body.apiKeysByModel === "object" ? body.apiKeysByModel : null;
  const customInstructions = typeof body.customInstructions === "string" ? body.customInstructions.trim() : "";
  const style = typeof body.style === "string" ? body.style.trim().slice(0, 80) : "";
  const mood = typeof body.mood === "string" ? body.mood.trim().slice(0, 80) : "";
  const lighting = typeof body.lighting === "string" ? body.lighting.trim().slice(0, 80) : "";
  const camera = typeof body.camera === "string" ? body.camera.trim().slice(0, 80) : "";
  const shot = typeof body.shot === "string" ? body.shot.trim().slice(0, 80) : "";
  const speed = typeof body.speed === "string" ? body.speed.trim().slice(0, 80) : "";
  const negativePrompt = typeof body.negativePrompt === "string" ? body.negativePrompt.trim().slice(0, 200) : "";
  const marketResearch = body.marketResearch === true;

  if (!concept) return "Enter a prompt first.";
  if (concept.length > MAX_PROMPT_CHARS) return `Prompt is too long (max ${MAX_PROMPT_CHARS} chars).`;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) return "Quantity: 1-100 only.";
  if (!ALLOWED_MODELS_SET.has(model)) return "Unknown model.";
  if (!ALLOWED_TYPES_SET.has(type)) return "Unknown prompt type.";

  if (marketResearch) {
    const geminiKeys = apiKeysByModel ? sanitizeKeys(apiKeysByModel.gemini) : validKeys;
    if (geminiKeys.length === 0) return "Market Research requires a Google Gemini API key.";
  } else if (validKeys.length === 0) {
    return "No API key. Add one via API Keys.";
  }

  return { concept, quantity, model, type, validKeys, apiKeysByModel, customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt, marketResearch };
}


async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseProviderError(status, message, provider) {
  const safeMessage = shortenError(message || `${provider} error (${status})`);
  if (status === 401 || status === 403) return new AppError(safeMessage, 401, "PROVIDER_AUTH");
  if (status === 429) return new AppError(safeMessage, 429, "PROVIDER_RATE_LIMIT");
  if (status >= 500) return new AppError(safeMessage, 502, "PROVIDER_UPSTREAM");
  return new AppError(safeMessage, 400, "PROVIDER_BAD_REQUEST");
}

function normalizeThrownError(err) {
  if (err instanceof AppError) return err;
  const msg = String(err?.message || "Provider request failed.");
  const lower = msg.toLowerCase();
  if (lower.includes("timeout") || lower.includes("aborted")) {
    return new AppError("Provider timeout. Try again.", 504, "PROVIDER_TIMEOUT");
  }
  return new AppError(shortenError(msg), 502, "PROVIDER_FAILURE");
}

function isRetryableError(err) {
  if (err instanceof AppError) {
    return err.status === 429 || err.status === 502 || err.status === 504;
  }
  return false;
}

function buildModelQueue(primaryModel, apiKeysByModel, validKeys) {
  const providerKey = PROVIDER_KEY_MAP[primaryModel] || primaryModel;
  const modelKeys = apiKeysByModel ? sanitizeKeys(apiKeysByModel[providerKey]) : [];
  const keys = modelKeys.length > 0 ? modelKeys : validKeys;
  const queue = [{ model: primaryModel, keys }];
  if (primaryModel === "gemini") {
    queue.push({ model: "gemini-lite", keys });
  } else if (primaryModel === "groq") {
    queue.push({ model: "groq-scout", keys });
  } else if (primaryModel === "groq-scout") {
    queue.push({ model: "groq", keys });
  } else if (primaryModel === "gemini-lite") {
    queue.push({ model: "gemini", keys });
  }
  return queue;
}

const OR_TEXT_FALLBACK_MODELS = [
  "google/gemini-2.5-flash-preview:free",
  "meta-llama/llama-4-maverick:free",
  "qwen/qwen3-235b-a22b:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
];

const _orTextCache = { models: null, ts: 0 };
const OR_TEXT_CACHE_TTL = 5 * 60 * 1000;

async function getOpenRouterTextModels(apiKey) {
  if (_orTextCache.models && Date.now() - _orTextCache.ts < OR_TEXT_CACHE_TTL) return _orTextCache.models;
  try {
    const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    }, 10000);
    if (!res.ok) return OR_TEXT_FALLBACK_MODELS;
    const json = await res.json();
    const models = (json.data || [])
      .filter(m => {
        const free = m.id?.endsWith(":free") || Number(m.pricing?.prompt) === 0;
        const ctx = m.context_length || 0;
        const isReasoning = /\b(r1|reasoning|think)\b/i.test(m.id || "");
        return free && ctx >= 8000 && !isReasoning;
      })
      .sort((a, b) => (b.context_length || 0) - (a.context_length || 0))
      .map(m => m.id)
      .slice(0, 6);
    const result = models.length > 0 ? models : OR_TEXT_FALLBACK_MODELS;
    _orTextCache.models = result;
    _orTextCache.ts = Date.now();
    return result;
  } catch {
    return OR_TEXT_FALLBACK_MODELS;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateRequest(body);
    if (typeof validation === "string") {
      return jsonError(validation, 400, "VALIDATION_ERROR");
    }

    const { concept, quantity, model, type, validKeys, apiKeysByModel, customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt, marketResearch } = validation;
    const systemPrompt = buildSystemPrompt(type, quantity, customInstructions, { style, mood, lighting, camera, shot, speed, negativePrompt });
    const userPrompt = buildDiverseUserPrompt(concept);

    if (marketResearch) {
      const geminiKeys = apiKeysByModel ? sanitizeKeys(apiKeysByModel.gemini) : validKeys;
      if (!geminiKeys.length) return jsonError("Market Research requires a Google Gemini API key.", 400, "VALIDATION_ERROR");
      return await handleMarketResearch(geminiKeys, systemPrompt, userPrompt, type, quantity, { customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt });
    }

    if (model === "openrouter") {
      return await handleOpenRouter(validKeys, systemPrompt, userPrompt);
    }

    if (model === "huggingface" || model.startsWith("hf-")) {
      const hfKeys = apiKeysByModel ? sanitizeKeys(apiKeysByModel.huggingface) : validKeys;
      if (!hfKeys.length) return jsonError("No HuggingFace key configured.", 400, "NO_KEYS");
      const hfModelId = MODEL_IDS[model] || MODEL_IDS["hf-llama"];
      return await handleHuggingFace(hfKeys, systemPrompt, userPrompt, hfModelId);
    }

    const modelQueue = buildModelQueue(model, apiKeysByModel, validKeys);

    let lastError = null;

    for (const modelItem of modelQueue) {
      const keys = modelItem.keys;
      if (!keys.length) continue;

      for (let i = 0; i < keys.length; i++) {
        const apiKey = keys[i];
        try {
          let response;
          if (modelItem.model === "gemini") response = await callGemini(apiKey, systemPrompt, userPrompt, MODEL_IDS.gemini);
          else if (modelItem.model === "gemini-lite") response = await callGemini(apiKey, systemPrompt, userPrompt, MODEL_IDS["gemini-lite"]);
          else if (modelItem.model === "groq") response = await callGroq(apiKey, systemPrompt, userPrompt, MODEL_IDS.groq);
          else if (modelItem.model === "groq-scout") response = await callGroq(apiKey, systemPrompt, userPrompt, MODEL_IDS["groq-scout"]);
          else if (modelItem.model === "mistral") response = await callMistral(apiKey, systemPrompt, userPrompt);
          else {
            lastError = new AppError(`Unknown model: ${modelItem.model}`, 400, "VALIDATION_ERROR");
            continue;
          }

          if (response.headers.get("X-Model-Used")) return response;
          if (response.body && modelItem.model !== "gemini") {
            const text = await response.text();
            return createTextResponse(text, modelItem.model);
          }
          return new Response(response.body, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Transfer-Encoding": "chunked",
              "X-Model-Used": modelItem.model,
            },
          });
        } catch (err) {
          const normalizedError = normalizeThrownError(err);
          lastError = normalizedError;
          if (i < keys.length - 1 && isRetryableError(normalizedError)) continue;
          if (i < keys.length - 1) continue;
          break;
        }
      }
    }
    if (lastError) return jsonError(lastError.message, lastError.status, lastError.code);
    return jsonError("All keys exhausted. Add new keys.", 429, "ALL_KEYS_EXHAUSTED");
  } catch {
    return jsonError("Something went wrong. Try again.", 500, "INTERNAL_ERROR");
  }
}

async function handleMarketResearch(geminiKeys, baseSystemPrompt, userConcept, type, quantity, { customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt } = {}) {
  const typeLabel = type === "vector" ? "vector/illustration" : type === "video" ? "stock video" : "stock photo";
  const platforms = "Adobe Stock, Shutterstock, iStock, Getty Images, Freepik, Dreamstime, Depositphotos";

  let settingsBlock = "";
  if (type === "video") {
    const mods = [];
    if (camera) mods.push(`Camera movement: ${camera}`);
    if (shot) mods.push(`Shot type: ${shot}`);
    if (speed) mods.push(`Pacing/speed: ${speed}`);
    if (mood) mods.push(`Mood/atmosphere: ${mood}`);
    if (mods.length) settingsBlock = `\nApply these cinematic attributes to every prompt:\n${mods.map(m => `- ${m}`).join("\n")}`;
  } else {
    const mods = [];
    if (style) mods.push(`Style: ${style}`);
    if (mood) mods.push(`Mood/atmosphere: ${mood}`);
    if (lighting) mods.push(`Lighting: ${lighting}`);
    if (mods.length) settingsBlock = `\nApply these visual attributes to every prompt:\n${mods.map(m => `- ${m}`).join("\n")}`;
  }
  const negBlock = negativePrompt ? `\nExclude from all prompts: ${negativePrompt}` : "";
  const customBlock = customInstructions ? `\nADDITIONAL INSTRUCTIONS (follow precisely):\n${customInstructions}` : "";

  const researchPrompt = `You are a microstock market research analyst and ${type === "video" ? "cinematographer" : type === "vector" ? "vector illustrator" : "stock photographer"} prompt engineer.

STEP 1 — MARKET RESEARCH:
Use Google Search to research CURRENT trending and best-selling ${typeLabel} niches, topics, and styles on these platforms: ${platforms}.
Focus on:
- What ${typeLabel} categories are trending RIGHT NOW
- Most downloaded/purchased ${typeLabel} themes this month
- Seasonal trends and upcoming events that drive ${typeLabel} sales
- Commercial niches with high demand but low competition
- The specific style, composition, and keywords that top-selling ${typeLabel}s use

STEP 2 — GENERATE PROMPTS:
Based on your market research findings, generate EXACTLY ${quantity} ${typeLabel} prompts related to "${userConcept}".

Each prompt must be:
- Optimized for what is ACTUALLY selling well right now on microstock platforms
- Commercially viable and high-quality enough to be accepted and sell on ${platforms}
- Detailed (2-3 sentences minimum) with specific visual descriptions
- Aligned with current market demand and trending topics you discovered
${settingsBlock}${negBlock}${customBlock}

IMPORTANT RULES:
- All content must be HALAL — absolutely NO nudity, alcohol, pork, gambling, violence, inappropriate content
- Focus on universal commercial themes: business, technology, healthcare, education, nature, lifestyle, food (halal), family, wellness
- Output ONLY numbered prompts (1. 2. 3. etc.)
- No introductions, research summaries, or explanations — ONLY the numbered prompts

Begin with market research, then generate ${quantity} commercially optimized prompts:`;

  let lastErr = null;
  for (const apiKey of geminiKeys) {
    try {
      const modelId = MODEL_IDS.gemini;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: researchPrompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }, 90000);

      if (!res.ok) {
        let errMsg = `Gemini error (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody.error?.message) errMsg = errBody.error.message;
        } catch {}
        lastErr = parseProviderError(res.status, errMsg, "Gemini");
        if (res.status === 429) continue;
        throw lastErr;
      }

      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join("");

      if (!text) {
        lastErr = new AppError("Gemini returned empty response.", 502, "PROVIDER_FAILURE");
        continue;
      }

      return createTextResponse(text, `${modelId}+search`);
    } catch (err) {
      lastErr = normalizeThrownError(err);
      if (isRetryableError(lastErr)) continue;
    }
  }
  if (lastErr) return jsonError(lastErr.message, lastErr.status, lastErr.code);
  return jsonError("Market Research failed. Check Gemini API key.", 502, "ALL_KEYS_EXHAUSTED");
}

async function handleOpenRouter(keys, systemPrompt, userPrompt) {
  let lastErr = null;
  for (const apiKey of keys) {
    const models = await getOpenRouterTextModels(apiKey);
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
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.9,
            max_tokens: 8192,
          }),
        });

        if (res.status === 429) { lastErr = new AppError("Rate limit hit. Please retry.", 429, "PROVIDER_RATE_LIMIT"); continue; }
        if (res.status === 401 || res.status === 403) {
          lastErr = new AppError("Invalid OpenRouter key.", 401, "PROVIDER_AUTH");
          break;
        }
        if (!res.ok) {
          let errMsg = `OpenRouter error (${res.status})`;
          try { const e = await res.json(); if (e?.error?.message) errMsg = e.error.message; } catch {}
          lastErr = new AppError(shortenError(errMsg), res.status >= 500 ? 502 : 400, "PROVIDER_ERROR");
          continue;
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
        if (!text) continue;

        return createTextResponse(text, `or:${model}`);
      } catch (err) {
        lastErr = normalizeThrownError(err);
        if (isRetryableError(lastErr)) continue;
      }
    }
  }
  if (lastErr) return jsonError(lastErr.message, lastErr.status, lastErr.code);
  return jsonError("OpenRouter: all models failed.", 502, "ALL_KEYS_EXHAUSTED");
}

const HF_TEXT_MODELS = [
  "meta-llama/Llama-3.3-70B-Instruct",
  "Qwen/Qwen2.5-72B-Instruct",
  "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
  "deepseek-ai/DeepSeek-V3-0324",
];

async function handleHuggingFace(keys, systemPrompt, userPrompt, preferredModel) {
  const models = preferredModel
    ? [preferredModel, ...HF_TEXT_MODELS.filter(m => m !== preferredModel)]
    : HF_TEXT_MODELS;
  let lastErr = null;
  for (const apiKey of keys) {
    for (const model of models) {
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
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.9,
            max_tokens: 8192,
          }),
        });

        if (res.status === 429) { lastErr = new AppError("Rate limit hit. Please retry.", 429, "PROVIDER_RATE_LIMIT"); continue; }
        if (res.status === 401 || res.status === 403) {
          lastErr = new AppError("Invalid HuggingFace token.", 401, "PROVIDER_AUTH");
          break;
        }
        if (res.status === 402) {
          lastErr = new AppError("HuggingFace free credits exhausted.", 402, "PROVIDER_RATE_LIMIT");
          continue;
        }
        if (!res.ok) {
          let errMsg = `HuggingFace error (${res.status})`;
          try { const e = await res.json(); if (e?.error) errMsg = typeof e.error === "string" ? e.error : e.error.message || errMsg; } catch {}
          lastErr = new AppError(shortenError(errMsg), res.status >= 500 ? 502 : 400, "PROVIDER_ERROR");
          continue;
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content || "";
        if (!text) continue;

        return createTextResponse(text, `hf:${model}`);
      } catch (err) {
        lastErr = normalizeThrownError(err);
        if (isRetryableError(lastErr)) continue;
      }
    }
  }
  if (lastErr) return jsonError(lastErr.message, lastErr.status, lastErr.code);
  return jsonError("HuggingFace: all models failed.", 502, "ALL_KEYS_EXHAUSTED");
}

async function callGemini(apiKey, systemPrompt, userPrompt, modelId) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 8192,
        ...(modelId === MODEL_IDS.gemini ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      },
    }),
  });

  if (!res.ok) {
    let errMsg = `Gemini error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody.error?.message) errMsg = errBody.error.message;
    } catch {}
    console.error(`[Gemini] ${modelId} → ${res.status}: ${errMsg}`);
    throw parseProviderError(res.status, errMsg, "Gemini");
  }
  if (!res.body) throw new Error("Provider returned empty stream.");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let failed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const parts = json?.candidates?.[0]?.content?.parts || [];
                const text = parts
                  .filter((p) => !p.thought && typeof p.text === "string")
                  .map((p) => p.text)
                  .join("");
                if (text) controller.enqueue(encoder.encode(text));
              } catch {}
            }
          }
        }
      } catch (err) {
        failed = true;
        controller.error(err);
        return;
      } finally {
        if (!failed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Model-Used": modelId,
    },
  });
}

async function callGroq(apiKey, systemPrompt, userPrompt, modelId) {
  const res = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    let errMsg = `Groq error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody.error?.message) errMsg = errBody.error.message;
    } catch {}
    throw parseProviderError(res.status, errMsg, "Groq");
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Groq returned empty response.");

  return createTextResponse(text, modelId);
}

async function callMistral(apiKey, systemPrompt, userPrompt) {
  const res = await fetchWithTimeout("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL_IDS.mistral,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    let errMsg = `Mistral error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody.error?.message) errMsg = errBody.error.message;
    } catch {}
    throw parseProviderError(res.status, errMsg, "Mistral");
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error("Mistral returned empty response.");

  return createTextResponse(text, "mistral");
}
