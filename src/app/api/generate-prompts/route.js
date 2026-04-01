import { MODEL_IDS, OR_MODEL_MAP, PROVIDER_KEY_MAP, ALLOWED_MODELS, ALLOWED_TYPES } from "@/config/models";
import { buildSystemPrompt } from "@/lib/promptBuilder";
import { jsonError, sanitizeKeys, fetchWithTimeout } from "@/lib/apiUtils";

const MAX_PROMPT_CHARS = 4000;
const REQUEST_TIMEOUT_MS = 60000;

const DIVERSITY_POOLS = {
  shared: {
    era: ["ancient civilizations", "medieval period", "Renaissance", "Victorian era", "1920s Art Deco", "1960s retro", "1980s neon", "Cold War era", "cyberpunk future", "far future space age", "post-apocalyptic", "prehistoric", "steampunk industrial", "Edo period Japan", "Ming dynasty China", "Ottoman empire"],
    region: ["Japanese countryside", "Scandinavian fjords", "Moroccan medina", "African savanna", "Amazon rainforest", "Arctic tundra", "Mediterranean coast", "Southeast Asian jungle", "Himalayan peaks", "Caribbean island", "Patagonian wilderness", "Saharan desert", "Scottish highlands", "New Zealand coast", "Peruvian mountains", "Icelandic lava fields"],
    mood: ["melancholic and lonely", "joyful and energetic", "serene and peaceful", "dark and ominous", "playful and whimsical", "romantic and intimate", "surreal and dreamlike", "mysterious and eerie", "epic and powerful", "nostalgic and warm", "tense and dramatic", "ethereal and otherworldly"],
  },
  image: {
    style: ["hyper-realistic photography", "abstract expressionism", "minimalist design", "baroque maximalism", "film noir", "impressionist painting", "pop art", "dark gothic", "painterly fine art", "macro close-up", "long exposure light trails", "infrared photography", "watercolor illustration", "double exposure composite", "tilt-shift miniature", "cross-process film look", "moody cinematic photography", "editorial style photography", "documentary photography"],
    lighting: ["golden hour sunrise", "blue hour twilight", "harsh midday sun", "moody overcast", "dramatic stormy sky", "soft foggy morning", "starlit night", "candlelight glow", "neon city lights", "bioluminescent glow", "lightning strike", "underwater caustics", "firelight warmth", "aurora borealis", "rembrandt lighting dramatic", "rim lighting backlit silhouette", "soft diffused window light", "chiaroscuro deep shadows", "volumetric fog rays"],
    composition: ["rule of thirds off-center", "symmetrical reflection", "leading lines perspective", "frame within a frame", "negative space minimal", "bird's eye view flat lay", "worm's eye dramatic angle", "Dutch angle tilted", "panoramic ultra-wide", "extreme close-up detail", "layered depth foreground-background", "diagonal dynamic tension", "centered hero subject isolation", "overhead top-down arrangement"],
    lens: ["shot on 85mm f/1.4 shallow bokeh", "wide-angle 24mm deep focus", "macro lens extreme detail", "50mm natural perspective", "telephoto 200mm compression", "tilt-shift miniature effect", "anamorphic cinematic flare", "fisheye ultra-wide distortion"],
    quality: ["8K ultra-high resolution", "DSLR quality sharp detail", "medium format Hasselblad look", "Kodak Portra 400 film tones", "Fuji Velvia vivid saturation", "RAW format high dynamic range"],
  },
  vector: {
    style: ["flat design 2D", "isometric 3D illustration", "line art minimal", "geometric abstract shapes", "gradient mesh smooth", "paper cut layered", "retro vintage poster", "kawaii cute style", "blueprint technical", "hand-drawn sketch", "pixel art retro", "art nouveau ornamental", "bauhaus modernist", "Memphis design 80s", "low-poly faceted", "sticker die-cut style"],
    palette: ["monochrome single hue", "complementary two-tone", "analogous warm harmony", "triadic vibrant bold", "pastel soft muted", "neon bright saturated", "earth tones natural", "jewel tones rich", "black and white contrast", "gradient rainbow spectrum", "duotone trendy", "limited 3-color palette", "terracotta and sage green warm", "teal and coral modern"],
    useCase: ["app icon design", "infographic element", "social media post asset", "website hero illustration", "logo mark concept", "pattern tile repeat", "icon set UI", "greeting card design", "book cover illustration", "packaging label art", "badge and emblem", "mascot character design", "presentation slide graphic", "banner ad creative", "seamless pattern textile"],
    rendering: ["no gradients flat solid fills", "subtle gradient shading", "clean crisp outlines", "rounded smooth curves", "sharp geometric edges", "hand-drawn organic lines"],
  },
  video: {
    cameraMove: ["slow dolly forward reveal", "sweeping crane aerial", "handheld documentary style", "smooth gimbal tracking", "rotating orbit around subject", "pull-back zoom out wide", "push-in zoom to detail", "panning left to right scenic", "tilt up from ground to sky", "static locked tripod", "slider lateral movement", "drone ascending overhead", "FPV first-person fly-through", "dolly zoom Vertigo effect", "steadicam fluid movement"],
    transition: ["crossfade dissolve smooth", "whip pan fast cut", "match cut shape transition", "light flash white out", "rack focus foreground-background", "time lapse speed ramp", "morph dissolve subject change", "split screen comparison", "iris wipe circular", "zoom transition seamless"],
    pacing: ["slow motion cinematic 120fps", "real-time natural flow", "hyperlapse time-lapse urban", "speed ramp fast-slow-fast", "stop-motion frame by frame", "reverse playback dramatic", "bullet time frozen moment", "timelapse sunrise to sunset", "normal speed with slow detail"],
    colorGrade: ["warm golden cinematic", "cool blue moody thriller", "desaturated muted documentary", "high contrast dramatic noir", "pastel soft dreamy", "teal and orange blockbuster", "vintage film grain retro", "neon cyberpunk saturated", "natural neutral realistic", "sepia aged nostalgic"],
    atmosphere: ["misty foggy ethereal", "crisp clear sharp detail", "hazy dreamlike soft", "moody stormy dramatic", "warm cozy intimate", "cold icy stark"],
  },
};

function pickRandom(arr, n) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function buildDiverseUserPrompt(concept, previousPrompts = [], { autoMode = false, autoCategory = "", autoContext = "", type = "image" } = {}) {
  const seed = Math.floor(Math.random() * 999983);
  const shared = DIVERSITY_POOLS.shared;
  const era = pickRandom(shared.era, 2).join(" or ");
  const region = pickRandom(shared.region, 2).join(" or ");
  const mood = pickRandom(shared.mood, 2).join(", ");

  let typeSpecificHint = "";

  if (type === "video") {
    const pool = DIVERSITY_POOLS.video;
    const cam = pickRandom(pool.cameraMove, 2).join(" or ");
    const trans = pickRandom(pool.transition, 2).join(" or ");
    const pace = pickRandom(pool.pacing, 2).join(" or ");
    const grade = pickRandom(pool.colorGrade, 2).join(" or ");
    const atmo = pickRandom(pool.atmosphere, 2).join(" or ");
    typeSpecificHint = `- Camera movement: ${cam}
- Transition style: ${trans}
- Pacing/speed: ${pace}
- Color grading: ${grade}
- Atmosphere: ${atmo}`;
  } else if (type === "vector") {
    const pool = DIVERSITY_POOLS.vector;
    const style = pickRandom(pool.style, 2).join(" or ");
    const palette = pickRandom(pool.palette, 2).join(" or ");
    const use = pickRandom(pool.useCase, 2).join(" or ");
    const render = pickRandom(pool.rendering, 2).join(" or ");
    typeSpecificHint = `- Art style: ${style}
- Color palette: ${palette}
- Use case: ${use}
- Rendering: ${render}`;
  } else {
    const pool = DIVERSITY_POOLS.image;
    const style = pickRandom(pool.style, 2).join(" or ");
    const light = pickRandom(pool.lighting, 2).join(" or ");
    const comp = pickRandom(pool.composition, 2).join(" or ");
    const lens = pickRandom(pool.lens, 1)[0];
    const qual = pickRandom(pool.quality, 1)[0];
    typeSpecificHint = `- Photography style: ${style}
- Lighting: ${light}
- Composition: ${comp}
- Lens/camera: ${lens}
- Quality reference: ${qual}`;
  }

  const diversityHint = `Creative inspiration angles (interpret freely — mix, combine, or subvert these):
- Era/time: ${era}
- Region/culture: ${region}
- Mood/atmosphere: ${mood}
${typeSpecificHint}`;

  const antiRepeatBlock = previousPrompts.length > 0
    ? `\n\nPREVIOUSLY GENERATED PROMPTS — study these carefully and DO NOT repeat their themes, subjects, settings, styles, color palettes, or visual concepts. Create something completely different:
${previousPrompts.slice(0, 12).map((p, i) => `${i + 1}. ${String(p).slice(0, 150)}`).join("\n")}`
    : "";

  const contextHint = autoContext ? `\nCreative direction: ${autoContext}` : "";
  const typeSpecificGuidance = type === "video"
    ? `- Follow this prompt structure: [Subject + Action] + [Setting] + [Camera Movement] + [Lighting] + [Color Grade] + [Atmosphere].
- Every prompt MUST describe a scene with inherent MOTION and temporal change — things moving, flowing, changing, growing, or transforming over time.
- Include SPECIFIC camera movements using professional terms (dolly, crane, tracking, orbit, steadicam, FPV, drone ascending).
- Describe the scene's natural flow: wind through leaves, water rippling, light shifting, shadows moving, clouds drifting, flames flickering.
- Specify atmosphere and mood: misty, crisp, hazy, moody, warm, cold.
- Include quality modifiers: 4K cinematic, slow motion, natural motion, realistic physics.
- Avoid static compositions — stock video buyers need dynamic content with visual energy.`
    : type === "vector"
    ? `- Follow this prompt structure: [Subject] + [Art Style] + [Colors/Palette] + [Composition] + [Rendering Rules] + [Use Case].
- Every prompt MUST describe content suitable for VECTOR illustration — clean lines, simple geometries, scalable graphics.
- Specify the exact art style: flat 2D, isometric, line art, low-poly, geometric, hand-drawn sketch, paper-cut, or retro poster.
- Define rendering rules: flat solid fills OR subtle gradients, clean crisp outlines, limited color palette (3-5 colors).
- Specify composition: isolated on white background, centered, or full-bleed seamless pattern.
- Include the intended use case: icon, infographic, social media asset, web illustration, packaging, pattern, or badge.
- Avoid photographic realism — vector art must be clean, simple, and commercially versatile for web, print, and app use.
- Where the design naturally allows it, include space for text placement — but never sacrifice the artwork's visual balance.`
    : `- Follow this prompt structure: [Shot Type] + [Subject + Details] + [Setting] + [Lighting] + [Camera/Lens] + [Style/Mood] + [Color Palette].
- Think like a professional photographer — specify the complete visual brief as if directing a real photo shoot.
- Include specific lens and camera references (85mm f/1.4, wide-angle 24mm, macro lens, medium format) for precise visual control.
- Specify lighting setup: golden hour, chiaroscuro, softbox, rembrandt, rim lighting, volumetric fog, window light.
- Describe composition and framing: rule of thirds, symmetrical, leading lines, flat-lay, extreme close-up, panoramic.
- Include quality modifiers: 8K resolution, DSLR quality, film stock tones (Kodak Portra, Fuji Velvia), high dynamic range.
- Focus on images that work as stock photos: versatile compositions, clean backgrounds, and universal appeal.
- When the composition naturally allows it, include areas of soft focus, open sky, blurred background, or clean surface that could serve as copy space — but NEVER force empty space that ruins the image's beauty. The image must look stunning on its own first.`;

  const isAiFreeChoice = autoMode && autoCategory === "ai-free-choice";

  const autoBlock = autoMode
    ? `\n\n[AUTO MODE — COMMERCIAL MICROSTOCK INTELLIGENCE]
${isAiFreeChoice
  ? `CREATIVE SEED (use as INSPIRATION only — you have FULL FREEDOM to choose ANY subject):
"${concept}"${contextHint}
These seed words are just a creative nudge to spark your imagination. You may use them, combine them, or COMPLETELY IGNORE them.
You can think of ANY halal subject in the entire world — fruits, tools, architecture, nature, technology, crafts, textiles, minerals, instruments, food, landscapes, patterns, textures, abstract concepts, cultural artifacts, or ANYTHING else.
Your goal: pick a commercially brilliant subject that stock photo/vector/video buyers would search for and license.`
  : `Category: ${autoCategory} | Subject: "${concept}"${contextHint}`}
You are generating for commercial microstock platforms (Shutterstock, Adobe Stock, Dreamstime).
TYPE-SPECIFIC REQUIREMENTS (${type.toUpperCase()}):
${typeSpecificGuidance}
COMMERCIAL REQUIREMENTS:
- Every prompt MUST describe content that real buyers would license for business, marketing, editorial, or design use.
- Each prompt should target a DIFFERENT buyer persona (marketer, blogger, designer, educator, publisher).
- Prioritize universally sellable concepts with broad market appeal — think search volume, trending themes, and gaps in stock libraries.
- Each prompt must feel like it was created by a different creative director — explore COMPLETELY different angles.
- AVOID generating content that already floods stock marketplaces. Be original, unexpected, and fresh while remaining commercially viable.
TIMELESS CONTENT RULE:
- Every prompt MUST describe content that is EVERGREEN — it should sell equally well today, next year, and 5 years from now.
- Do NOT reference specific dates, current events, trending memes, or time-bound concepts that will become outdated.
- Focus on universal themes that have permanent commercial value: nature, food, workspace, wellness, education, architecture, crafts, textures, patterns, and abstract concepts.
MICROSTOCK PLATFORM INTELLIGENCE:
- Shutterstock buyers love: isolated objects on clean backgrounds, conceptual imagery, workspace flat-lays, food photography, nature close-ups, and abstract textures.
- Adobe Stock buyers love: editorial-style scenes, creative compositions, artistic lighting, lifestyle vignettes (without humans), and high-end product styling.
- Top-selling content across all platforms: clean minimalism, warm natural lighting, authentic textures, bold color contrasts, and subjects photographed from unexpected angles.`
    : "";

  return `[Session seed: ${seed}]

Topic: ${concept}
${antiRepeatBlock}${autoBlock}

${diversityHint}

HALAL CONTENT RULE: Do NOT include any human figures, human body parts, human faces, human hands, human silhouettes, or human shadows in any prompt. Focus on objects, nature, architecture, food, textures, patterns, landscapes, and still life. This is a strict requirement.

OUTPUT FORMAT (STRICT):
- Output ONLY numbered prompts (1. 2. 3. etc.)
- Each prompt must be 2-3 detailed sentences minimum with specific visual descriptions.
- Do NOT include any introduction, explanation, commentary, summary, or sign-off text.
- Do NOT say "Here are your prompts" or "I hope these help" or anything similar.
- Start directly with "1." and end after the last numbered prompt. Nothing else.

Generate prompts that feel completely fresh and unexpected. Each prompt must explore a DIFFERENT combination of the inspiration angles above — and must be nothing like the previously generated prompts.`;
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
  const autoMode = body.autoMode === true;
  const autoSubject = typeof body.autoSubject === "string" ? body.autoSubject.trim().slice(0, 400) : "";
  const autoCategory = typeof body.autoCategory === "string" ? body.autoCategory.trim().slice(0, 100) : "";
  const autoContext = typeof body.autoContext === "string" ? body.autoContext.trim().slice(0, 200) : "";
  const festivalContext = typeof body.festivalContext === "string" ? body.festivalContext.trim().slice(0, 2000) : "";
  const previousPrompts = Array.isArray(body.previousPrompts)
    ? body.previousPrompts.filter(p => typeof p === "string" && p.trim().length > 10).slice(0, 15)
    : [];

  if (!autoMode && !concept) return "Enter a prompt first.";
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

  const effectiveConcept = autoMode && autoSubject ? autoSubject : concept;
  return { concept: effectiveConcept, quantity, model, type, validKeys, apiKeysByModel, customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt, marketResearch, autoMode, autoSubject, autoCategory, autoContext, festivalContext, previousPrompts };
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
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
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
 
    const { concept, quantity, model, type, validKeys, apiKeysByModel, customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt, marketResearch, autoMode, autoCategory, autoContext, festivalContext, previousPrompts } = validation;
    const systemPrompt = buildSystemPrompt(type, quantity, customInstructions, { style, mood, lighting, camera, shot, speed, negativePrompt, autoMode: !!autoMode });
    let userPrompt = buildDiverseUserPrompt(concept, previousPrompts, { autoMode, autoCategory, autoContext, type });
    if (festivalContext) {
      userPrompt += festivalContext;
    }

    if (marketResearch) {
      const geminiKeys = apiKeysByModel ? sanitizeKeys(apiKeysByModel.gemini) : validKeys;
      if (!geminiKeys.length) return jsonError("Market Research requires a Google Gemini API key.", 400, "VALIDATION_ERROR");
      return await handleMarketResearch(geminiKeys, systemPrompt, userPrompt, type, quantity, { customInstructions, style, mood, lighting, camera, shot, speed, negativePrompt });
    }

    if (model === "openrouter" || model === "or-auto" || model.startsWith("or-")) {
      const orKeys = apiKeysByModel ? sanitizeKeys(apiKeysByModel.openrouter) : validKeys;
      if (!orKeys.length) return jsonError("No OpenRouter key configured.", 400, "NO_KEYS");
      const specificModel = OR_MODEL_MAP[model] || null;
      return await handleOpenRouter(orKeys, systemPrompt, userPrompt, specificModel);
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

async function handleOpenRouter(keys, systemPrompt, userPrompt, specificModel = null) {
  let lastErr = null;
  for (const apiKey of keys) {
    const models = specificModel ? [specificModel] : await getOpenRouterTextModels(apiKey);
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
