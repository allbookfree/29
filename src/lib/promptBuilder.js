export function buildSystemPrompt(type, quantity, customInstructions, { style, mood, lighting, camera, shot, speed, negativePrompt } = {}) {
  const typeLabel = type === "vector" ? "vector" : type === "video" ? "video" : "image";

  let modifierBlock = "";
  if (type === "video") {
    const mods = [];
    if (camera) mods.push(`Camera movement: ${camera}`);
    if (shot) mods.push(`Shot type: ${shot}`);
    if (speed) mods.push(`Pacing/speed: ${speed}`);
    if (mood) mods.push(`Mood/atmosphere: ${mood}`);
    modifierBlock = mods.length > 0 ? `\nApply these cinematic attributes to every prompt:\n${mods.map(m => `- ${m}`).join("\n")}` : "";
  } else {
    const mods = [];
    if (style) mods.push(`Style: ${style}`);
    if (mood) mods.push(`Mood/atmosphere: ${mood}`);
    if (lighting) mods.push(`Lighting: ${lighting}`);
    modifierBlock = mods.length > 0 ? `\nApply these visual attributes to every prompt:\n${mods.map(m => `- ${m}`).join("\n")}` : "";
  }
  const negativeBlock = negativePrompt ? `\nExclude from all prompts: ${negativePrompt}` : "";

  const qualityBlock = type === "video"
    ? `QUALITY RULE: Each prompt MUST be highly detailed (minimum 2-3 sentences). Every prompt must include: specific subject/action, detailed scene/setting, camera movement (pan, dolly, tracking, crane, etc.), lighting description (golden hour, neon, dramatic shadows, etc.), mood/atmosphere, and visual style. Write each prompt as if a professional cinematographer will use it directly. If the user concept is vague or says "random", YOU must invent creative, diverse, cinematic scenarios with rich detail — never generate short or generic prompts.`
    : type === "vector"
    ? `QUALITY RULE: Each prompt MUST be highly detailed (minimum 2-3 sentences). Every prompt must include: specific subject matter, art style (flat, line art, geometric, isometric, hand-drawn, etc.), color palette description, composition details, intended use case (web, print, app, social media), and design elements. Write each prompt as if a professional illustrator will use it to create a sellable vector. If the user concept is vague or says "random", YOU must invent creative, diverse illustration concepts with rich visual detail — never generate short or generic prompts.`
    : `QUALITY RULE: Each prompt MUST be highly detailed (minimum 2-3 sentences). Every prompt must include: specific subject, scene composition, lighting (natural, studio, dramatic, soft, golden hour, etc.), color palette or mood, camera angle/perspective, background/environment details, and artistic style if relevant. Write each prompt as if a professional photographer or AI artist will use it to create a stunning, sellable image. If the user concept is vague or says "random", YOU must invent creative, diverse, visually rich scenarios — never generate short or generic prompts.`;

  if (customInstructions) {
    const filledInstructions = customInstructions
      .replace(/\{count\}/gi, quantity)
      .replace(/\{quantity\}/gi, quantity)
      .replace(/\{n\}/gi, quantity);

    return `You are a world-class professional ${typeLabel} prompt engineer. Your prompts are used by professionals to generate high-quality commercial content.

ABSOLUTE RULE: Generate EXACTLY ${quantity} ${typeLabel} prompts — not more, not less.
BASELINE QUALITY: ${qualityBlock}
${modifierBlock}${negativeBlock}

YOUR MASTER INSTRUCTIONS (follow these with absolute precision — they override everything else including output format):
${filledInstructions}

CRITICAL: The master instructions above are your PRIMARY guide. Follow their output format, their rules, their style, and their requirements EXACTLY as written. Do not add your own format. Do not simplify. Do not shorten. Execute them faithfully.`;
  }

  if (type === "video") {
    return `You are a world-class cinematic video prompt engineer for AI video generators (Sora, Runway, Kling, Pika, Veo).
Your prompts will be used directly to generate professional video content.

STRICT RULES:
1. Generate EXACTLY ${quantity} video prompts — not more, not less.
2. Output ONLY numbered prompts. No introductions, explanations, or extra text.
3. ${qualityBlock}
4. DIVERSITY: Vary subjects, genres, settings, camera techniques, and moods across prompts. No two prompts should feel similar.
${modifierBlock}${negativeBlock}

Begin generating ${quantity} detailed, cinematic video prompts now:`;
  }

  return `You are a world-class professional ${typeLabel} prompt engineer for AI image generators (Midjourney, DALL-E, Stable Diffusion, Flux, Ideogram).
Your prompts will be used directly to generate stunning, commercial-quality ${typeLabel}s.

STRICT RULES:
1. Generate EXACTLY ${quantity} ${typeLabel} prompts — not more, not less.
2. Output ONLY numbered prompts. No introductions, explanations, or extra text.
3. ${qualityBlock}
4. DIVERSITY: Vary subjects, styles, compositions, lighting, and moods across prompts. No two prompts should feel similar.
${modifierBlock}${negativeBlock}

Begin generating ${quantity} detailed, professional ${typeLabel} prompts now:`;
}

export const MODEL_REQUEST_INFO = {
  "gemini": { endpoint: "generativelanguage.googleapis.com", modelId: "gemini-2.5-flash", temperature: 0.9, maxTokens: 8192 },
  "gemini-2.5-flash": { endpoint: "generativelanguage.googleapis.com", modelId: "gemini-2.5-flash", temperature: 0.9, maxTokens: 8192 },
  "gemini-lite": { endpoint: "generativelanguage.googleapis.com", modelId: "gemini-2.5-flash-lite", temperature: 0.9, maxTokens: 8192 },
  "gemini-2.5-flash-lite": { endpoint: "generativelanguage.googleapis.com", modelId: "gemini-2.5-flash-lite", temperature: 0.9, maxTokens: 8192 },
  "groq": { endpoint: "api.groq.com/openai/v1/chat/completions", modelId: "llama-3.3-70b-versatile", temperature: 0.9, maxTokens: 8192 },
  "llama-3.3-70b-versatile": { endpoint: "api.groq.com/openai/v1/chat/completions", modelId: "llama-3.3-70b-versatile", temperature: 0.9, maxTokens: 8192 },
  "groq-scout": { endpoint: "api.groq.com/openai/v1/chat/completions", modelId: "meta-llama/llama-4-scout-17b-16e-instruct", temperature: 0.9, maxTokens: 8192 },
  "mistral": { endpoint: "api.mistral.ai/v1/chat/completions", modelId: "open-mixtral-8x22b", temperature: 0.9, maxTokens: 8192 },
  "openrouter": { endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "auto-selected (best free model)", temperature: 0.9, maxTokens: 8192 },
  "huggingface": { endpoint: "router.huggingface.co/v1/chat/completions", modelId: "meta-llama/Llama-3.3-70B-Instruct", temperature: 0.9, maxTokens: 8192 },
};

export function getRequestInfo(modelKey) {
  if (!modelKey) return null;
  const base = modelKey.replace("+search", "");
  const info = MODEL_REQUEST_INFO[base] || MODEL_REQUEST_INFO[modelKey];
  if (!info) return { endpoint: "ai provider API", modelId: modelKey, temperature: 0.9, maxTokens: 8192 };
  const extra = modelKey.endsWith("+search") ? "Google Search grounding enabled" : null;
  return { ...info, extra };
}
