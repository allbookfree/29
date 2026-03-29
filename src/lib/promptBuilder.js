export function buildSystemPrompt(type, quantity, customInstructions, { style, mood, lighting, camera, shot, speed, negativePrompt, autoMode = false } = {}) {
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
  const halalBlock = `\nHALAL CONTENT RULE: NEVER include human figures, human body parts, human faces, human hands, human silhouettes, or human shadows in any prompt. Focus exclusively on objects, nature, architecture, food, textures, patterns, landscapes, still life, and non-living subjects.`;
  const autoCommercialBlock = autoMode ? `\nCOMMERCIAL MICROSTOCK EXPERTISE: You are generating prompts for commercial microstock platforms (Shutterstock, Adobe Stock, Dreamstime). Every prompt must describe content that real buyers would license for business, marketing, editorial, or design use. Prioritize universally sellable concepts with broad market appeal. Think about search volume, trending visual themes, and gaps in existing stock libraries.` : "";

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

    const customDiversityRule = type === "video"
      ? `ANTI-REPETITION RULE (mandatory — cannot be overridden): Every single prompt MUST feel like it comes from a completely different creative universe. Vary time period/era, geographic region/culture, cinematic genre, camera technique, mood/tone, and color palette across ALL prompts. If one prompt is modern urban, the next must be ancient or futuristic. The user message contains previously generated prompts — study them carefully and create something completely different. Repetition of setting, mood, or style is a failure.`
      : `ANTI-REPETITION RULE (mandatory — cannot be overridden): Every single prompt MUST feel like it comes from a completely different creative universe. Vary time period/era, geographic region/culture, artistic style or medium, lighting condition, mood/emotion, and color palette across ALL prompts. If one prompt is modern urban, the next must be ancient, futuristic, or natural. The user message contains previously generated prompts — study them carefully and create something completely different. Repetition of setting, mood, or visual style is a failure.`;

    return `You are a world-class professional ${typeLabel} prompt engineer. Your prompts are used by professionals to generate high-quality commercial content.

ABSOLUTE RULE: Generate EXACTLY ${quantity} ${typeLabel} prompts — not more, not less.
BASELINE QUALITY: ${qualityBlock}
${customDiversityRule}
${modifierBlock}${negativeBlock}${halalBlock}

YOUR MASTER INSTRUCTIONS (follow these with absolute precision — they control format, style, and output structure):
${filledInstructions}

CRITICAL: Follow the master instructions above for format and style. The ANTI-REPETITION RULE above is non-negotiable and applies on top of everything — every prompt must be from a completely different creative universe.`;
  }

  const diversityRule = type === "video"
    ? `RADICAL DIVERSITY (most important rule after count): Every single prompt MUST feel like it comes from a completely different creative universe. Vary ALL of these across your prompts: (1) time period/era, (2) geographic region or culture, (3) cinematic genre, (4) camera technique, (5) mood/tone, (6) scale (macro vs epic wide shot), (7) color palette. If you generate a modern urban scene, the next must be ancient or futuristic. If one is slow and serene, the next must be fast-paced. Repetition of setting, mood, or style is a failure.`
    : `RADICAL DIVERSITY (most important rule after count): Every single prompt MUST feel like it comes from a completely different creative universe. Vary ALL of these across your prompts: (1) time period/era, (2) geographic region or culture, (3) artistic style or medium, (4) lighting condition, (5) mood/emotion, (6) scale and perspective, (7) color palette. If you generate a modern urban scene, the next must be ancient or futuristic or natural. If one is warm and joyful, the next must be cool, mysterious or dramatic. Repetition of setting, mood, or visual style is a failure.`;

  if (type === "video") {
    return `You are a world-class cinematic video prompt engineer for AI video generators (Sora, Runway, Kling, Pika, Veo).
Your prompts will be used directly to generate professional video content.

STRICT RULES:
1. Generate EXACTLY ${quantity} video prompts — not more, not less.
2. Output ONLY numbered prompts. No introductions, explanations, or extra text.
3. ${qualityBlock}
4. ${diversityRule}
${modifierBlock}${negativeBlock}${halalBlock}${autoCommercialBlock}

The user's request includes creative diversity inspiration angles — use them as loose jumping-off points, not rigid instructions. Mix and subvert them across prompts to maximize variety.

Begin generating ${quantity} radically diverse, detailed cinematic video prompts now:`;
  }

  return `You are a world-class professional ${typeLabel} prompt engineer for AI image generators (Midjourney, DALL-E, Stable Diffusion, Flux, Ideogram).
Your prompts will be used directly to generate stunning, commercial-quality ${typeLabel}s.

STRICT RULES:
1. Generate EXACTLY ${quantity} ${typeLabel} prompts — not more, not less.
2. Output ONLY numbered prompts. No introductions, explanations, or extra text.
3. ${qualityBlock}
4. ${diversityRule}
${modifierBlock}${negativeBlock}${halalBlock}${autoCommercialBlock}

The user's request includes creative diversity inspiration angles — use them as loose jumping-off points, not rigid instructions. Mix and subvert them across prompts to maximize variety.

Begin generating ${quantity} radically diverse, detailed professional ${typeLabel} prompts now:`;
}

export const MODEL_REQUEST_INFO = {
  "gemini":              { providerName: "Google Gemini", endpoint: "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse", modelId: "gemini-2.5-flash", temperature: 1.0, maxTokens: 8192, requestFormat: "Gemini API (system_instruction + contents)", extra: "topP: 0.95 · thinkingBudget: 0 (Gemini 2.5)" },
  "gemini-2.5-flash":   { providerName: "Google Gemini", endpoint: "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse", modelId: "gemini-2.5-flash", temperature: 1.0, maxTokens: 8192, requestFormat: "Gemini API (system_instruction + contents)", extra: "topP: 0.95 · thinkingBudget: 0 (Gemini 2.5)" },
  "gemini-lite":        { providerName: "Google Gemini", endpoint: "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse", modelId: "gemini-2.5-flash-lite", temperature: 1.0, maxTokens: 8192, requestFormat: "Gemini API (system_instruction + contents)", extra: "topP: 0.95" },
  "gemini-2.5-flash-lite": { providerName: "Google Gemini", endpoint: "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:streamGenerateContent?alt=sse", modelId: "gemini-2.5-flash-lite", temperature: 1.0, maxTokens: 8192, requestFormat: "Gemini API (system_instruction + contents)", extra: "topP: 0.95" },
  "groq":               { providerName: "Groq", endpoint: "api.groq.com/openai/v1/chat/completions", modelId: "llama-3.3-70b-versatile", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "llama-3.3-70b-versatile": { providerName: "Groq", endpoint: "api.groq.com/openai/v1/chat/completions", modelId: "llama-3.3-70b-versatile", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "groq-scout":         { providerName: "Groq", endpoint: "api.groq.com/openai/v1/chat/completions", modelId: "meta-llama/llama-4-scout-17b-16e-instruct", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "mistral":            { providerName: "Mistral AI", endpoint: "api.mistral.ai/v1/chat/completions", modelId: "open-mixtral-8x22b", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "openrouter":         { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "auto-selected (best free model)", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)", extra: "Auto-selects best free model · Headers: HTTP-Referer, X-Title" },
  "or-auto":            { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "auto-selected (best free model)", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)", extra: "Auto-discovers best free model" },
  "or-gemini-flash":    { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "google/gemini-2.5-flash-preview:free", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "or-maverick":        { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "meta-llama/llama-4-maverick:free", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "or-qwen3":           { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "qwen/qwen3-235b-a22b:free", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "or-deepseek-v3":     { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "deepseek/deepseek-chat-v3-0324:free", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "or-mistral-small":   { providerName: "OpenRouter", endpoint: "openrouter.ai/api/v1/chat/completions", modelId: "mistralai/mistral-small-3.2-24b-instruct:free", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)" },
  "huggingface":        { providerName: "HuggingFace Inference", endpoint: "router.huggingface.co/v1/chat/completions", modelId: "meta-llama/Llama-3.3-70B-Instruct", temperature: 0.9, maxTokens: 8192, requestFormat: "OpenAI-compatible (messages array)", extra: "Falls back through: Qwen2.5-72B → Mistral-Small → DeepSeek-V3" },
};

export function getRequestInfo(modelKey) {
  if (!modelKey) return null;

  const key = modelKey.replace("+search", "");
  const isSearch = modelKey.endsWith("+search");

  if (key.startsWith("or:")) {
    const actualModel = key.replace("or:", "");
    return {
      providerName: "OpenRouter",
      endpoint: "openrouter.ai/api/v1/chat/completions",
      modelId: actualModel,
      temperature: 0.9,
      maxTokens: 8192,
      requestFormat: "OpenAI-compatible (messages array)",
      extra: "HTTP-Referer: ai-prompt-studio.replit.app · X-Title: AI Prompt Studio",
    };
  }

  if (key.startsWith("hf:")) {
    const actualModel = key.replace("hf:", "");
    return {
      providerName: "HuggingFace Inference",
      endpoint: "router.huggingface.co/v1/chat/completions",
      modelId: actualModel,
      temperature: 0.9,
      maxTokens: 8192,
      requestFormat: "OpenAI-compatible (messages array)",
    };
  }

  const info = MODEL_REQUEST_INFO[key];
  if (!info) {
    return {
      providerName: key,
      endpoint: "AI provider API",
      modelId: key,
      temperature: 0.9,
      maxTokens: 8192,
      requestFormat: "Unknown",
    };
  }

  const result = { ...info };
  if (isSearch) {
    result.extra = "Google Search grounding enabled (tools: google_search)";
    result.endpoint = "generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    result.requestFormat = "Gemini API with Google Search tool";
  }
  return result;
}

export function buildRequestBodyPreview(usedModel, systemPrompt, userMessage) {
  if (!usedModel || !systemPrompt || !userMessage) return null;

  const key = usedModel.replace("+search", "");
  const isSearch = usedModel.endsWith("+search");

  if (isSearch) {
    return JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: "(Combined market-research + generation prompt — built server-side. Includes real-time Google Search grounding instructions.)" }]
      }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } }
    }, null, 2);
  }

  const isGemini = key.startsWith("gemini") || key === "gemini-2.5-flash" || key === "gemini-2.5-flash-lite";
  if (isGemini) {
    const isFlashLite = key === "gemini-lite" || key === "gemini-2.5-flash-lite";
    return JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 8192,
        ...(!isFlashLite ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      }
    }, null, 2);
  }

  if (key.startsWith("or:")) {
    const modelId = key.replace("or:", "");
    return JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 8192
    }, null, 2);
  }

  if (key.startsWith("hf:")) {
    const modelId = key.replace("hf:", "");
    return JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.9,
      max_tokens: 8192
    }, null, 2);
  }

  const info = MODEL_REQUEST_INFO[key];
  const modelId = info?.modelId || key;
  return JSON.stringify({
    model: modelId,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ],
    temperature: 0.9,
    max_tokens: 8192
  }, null, 2);
}
