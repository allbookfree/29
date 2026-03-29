export const MODEL_IDS = {
  gemini: "gemini-2.5-flash",
  "gemini-lite": "gemini-2.5-flash-lite",
  groq: "llama-3.3-70b-versatile",
  "groq-scout": "meta-llama/llama-4-scout-17b-16e-instruct",
  mistral: "open-mixtral-8x22b",
  "hf-llama": "meta-llama/Llama-3.3-70B-Instruct",
  "hf-qwen": "Qwen/Qwen2.5-72B-Instruct",
  "hf-mistral": "mistralai/Mistral-Small-3.1-24B-Instruct-2503",
  "hf-deepseek": "deepseek-ai/DeepSeek-V3-0324",
  huggingface: "meta-llama/Llama-3.3-70B-Instruct",
};

export const OR_MODEL_MAP = {
  "or-auto": null,
  "or-nemotron": "nvidia/nemotron-3-super-120b-a12b:free",
  "or-qwen3": "qwen/qwen3-next-80b-a3b-instruct:free",
  "or-gpt-oss": "openai/gpt-oss-120b:free",
  "or-gemma": "google/gemma-3-27b-it:free",
  "or-stepfun": "stepfun/step-3.5-flash:free",
};

export const MODEL_LABELS = {
  gemini: "Gemini 2.5 Flash",
  "gemini-lite": "Gemini Flash-Lite",
  groq: "Llama 3.3 70B",
  "groq-scout": "Llama 4 Scout",
  mistral: "Mixtral 8x22B",
  openrouter: "OpenRouter",
  "or-auto": "OR: Auto (Best Free)",
  "or-nemotron": "OR: Nemotron Super 120B",
  "or-qwen3": "OR: Qwen3 Next 80B",
  "or-gpt-oss": "OR: GPT-OSS 120B",
  "or-gemma": "OR: Gemma 3 27B",
  "or-stepfun": "OR: Step 3.5 Flash",
  "hf-llama": "hf:Llama-3.3-70B",
  "hf-qwen": "hf:Qwen2.5-72B",
  "hf-mistral": "hf:Mistral-Small",
  "hf-deepseek": "hf:DeepSeek-V3",
  huggingface: "HuggingFace",
};

export const PROVIDER_KEY_MAP = {
  "gemini-lite": "gemini",
  "groq-scout": "groq",
  "or-auto": "openrouter",
  "or-nemotron": "openrouter",
  "or-qwen3": "openrouter",
  "or-gpt-oss": "openrouter",
  "or-gemma": "openrouter",
  "or-stepfun": "openrouter",
  "hf-llama": "huggingface",
  "hf-qwen": "huggingface",
  "hf-mistral": "huggingface",
  "hf-deepseek": "huggingface",
};

export const PROVIDERS_UI = [
  { value: "google", label: "Google", apiKey: "gemini" },
  { value: "groq", label: "Groq", apiKey: "groq" },
  { value: "mistral", label: "Mistral", apiKey: "mistral" },
  { value: "openrouter", label: "OpenRouter", apiKey: "openrouter" },
  { value: "huggingface", label: "HuggingFace", apiKey: "huggingface" },
];

export const ALLOWED_MODELS = [
  "gemini", "gemini-lite", "groq", "groq-scout", "mistral",
  "openrouter", "or-auto", "or-nemotron", "or-qwen3", "or-gpt-oss", "or-gemma", "or-stepfun",
  "huggingface", "hf-llama", "hf-qwen", "hf-mistral", "hf-deepseek",
];

export const ALLOWED_TYPES = ["image", "vector", "video"];
