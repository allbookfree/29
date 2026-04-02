"use client";

import { createContext, useContext, useState } from "react";

const ApiKeyContext = createContext(null);

const STORAGE_KEY = "ai-prompt-studio-keys";
const STORAGE_MODE_KEY = "ai-prompt-studio-storage-mode";
const STORAGE_MODELS_KEY = "ai-prompt-studio-models";

const DEFAULT_KEYS = {
  gemini: [""],
  groq: [""],
  mistral: [""],
  openrouter: [""],
  huggingface: [""],
};
const DEFAULT_MODE = "local";
const DEFAULT_SELECTED_MODELS = {
  gemini: "gemini-3",
  groq: "groq",
  mistral: "mistral",
  openrouter: "or-auto",
  huggingface: "hf-llama",
};

const VALID_MODELS = {
  gemini: ["gemini", "gemini-lite", "gemini-3", "gemini-3-lite"],
  groq: ["groq", "groq-scout"],
  mistral: ["mistral"],
  openrouter: ["or-auto", "or-nemotron", "or-qwen3", "or-gpt-oss", "or-llama", "or-hermes"],
  huggingface: ["hf-llama", "hf-qwen", "hf-mistral", "hf-deepseek"],
};

function normalizeKeys(input) {
  const source = Array.isArray(input) ? input : typeof input === "string" ? [input] : [""];
  const normalized = [];
  const seen = new Set();
  for (const item of source) {
    const value = typeof item === "string" ? item.trim() : "";
    if (!value) {
      normalized.push("");
      continue;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized.length > 0 ? normalized : [""];
}

function readStorageMode() {
  if (typeof window === "undefined") return DEFAULT_MODE;
  const mode = localStorage.getItem(STORAGE_MODE_KEY);
  return mode === "session" ? "session" : DEFAULT_MODE;
}

function getInitialKeys() {
  if (typeof window === 'undefined') return DEFAULT_KEYS;
  try {
    const mode = readStorageMode();
    const preferredStorage = mode === "session" ? sessionStorage : localStorage;
    const fallbackStorage = mode === "session" ? localStorage : sessionStorage;
    const stored = preferredStorage.getItem(STORAGE_KEY) ?? fallbackStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        gemini: normalizeKeys(parsed.gemini),
        groq: normalizeKeys(parsed.groq),
        mistral: normalizeKeys(parsed.mistral),
        openrouter: normalizeKeys(parsed.openrouter),
        huggingface: normalizeKeys(parsed.huggingface),
      };
    }
  } catch (e) {
    console.error("Failed to load API keys:", e);
  }
  return DEFAULT_KEYS;
}

function getInitialSelectedModels() {
  if (typeof window === 'undefined') return DEFAULT_SELECTED_MODELS;
  try {
    const stored = localStorage.getItem(STORAGE_MODELS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const validGemini = VALID_MODELS.gemini.includes(parsed.gemini) ? parsed.gemini : "gemini";
      const validGroq = VALID_MODELS.groq.includes(parsed.groq) ? parsed.groq : "groq";
      const validMistral = VALID_MODELS.mistral.includes(parsed.mistral) ? parsed.mistral : "mistral";
      const validOr = VALID_MODELS.openrouter.includes(parsed.openrouter) ? parsed.openrouter : "or-auto";
      const validHf = VALID_MODELS.huggingface.includes(parsed.huggingface) ? parsed.huggingface : "hf-llama";
      return { gemini: validGemini, groq: validGroq, mistral: validMistral, openrouter: validOr, huggingface: validHf };
    }
  } catch (e) {}
  return DEFAULT_SELECTED_MODELS;
}

export function ApiKeyProvider({ children }) {
  const [keys, setKeys] = useState(getInitialKeys);
  const [storageMode, setStorageMode] = useState(readStorageMode);
  const [testResult, setTestResult] = useState({});
  const [testing, setTesting] = useState({});
  const [selectedModels, setSelectedModelsState] = useState(getInitialSelectedModels);

  const saveKeys = (newKeys) => {
    const normalized = {
      gemini: normalizeKeys(newKeys.gemini),
      groq: normalizeKeys(newKeys.groq),
      mistral: normalizeKeys(newKeys.mistral),
      openrouter: normalizeKeys(newKeys.openrouter),
      huggingface: normalizeKeys(newKeys.huggingface),
    };
    setKeys(normalized);
    try {
      const writeStorage = storageMode === "session" ? sessionStorage : localStorage;
      const clearStorage = storageMode === "session" ? localStorage : sessionStorage;
      writeStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      clearStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to save API keys:", e);
    }
  };

  const setSelectedModel = (providerKey, modelValue) => {
    setSelectedModelsState(prev => {
      const next = { ...prev, [providerKey]: modelValue };
      try { localStorage.setItem(STORAGE_MODELS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const updateStorageMode = (mode) => {
    const nextMode = mode === "session" ? "session" : "local";
    setStorageMode(nextMode);
    try {
      localStorage.setItem(STORAGE_MODE_KEY, nextMode);
      const targetStorage = nextMode === "session" ? sessionStorage : localStorage;
      const clearStorage = nextMode === "session" ? localStorage : sessionStorage;
      targetStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      clearStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to update storage mode:", e);
    }
  };

  const getKey = (provider) => {
    const providerKeys = keys[provider] || [""];
    return providerKeys[0] || "";
  };

  const getAllKeys = (provider) => {
    const providerKeys = keys[provider];
    if (!providerKeys) return [""];
    if (Array.isArray(providerKeys)) return providerKeys.filter(k => k);
    if (typeof providerKeys === 'string' && providerKeys) return [providerKeys];
    return [""];
  };

  const testKey = async (id, key, provider) => {
    if (!key) {
      setTestResult(prev => ({ ...prev, [id]: { success: false, message: "Enter a key first" } }));
      return;
    }

    setTesting(prev => ({ ...prev, [id]: true }));
    setTestResult(prev => ({ ...prev, [id]: null }));

    try {
      let res;

      if (provider === "gemini") {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      } else if (provider === "groq") {
        res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${key}` }
        });
      } else if (provider === "mistral") {
        res = await fetch("https://api.mistral.ai/v1/models", {
          headers: { Authorization: `Bearer ${key}` }
        });
      } else if (provider === "openrouter") {
        res = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${key}` }
        });
      } else if (provider === "huggingface") {
        res = await fetch("https://router.huggingface.co/v1/models", {
          headers: { Authorization: `Bearer ${key}` }
        });
      }

      if (res?.ok) {
        setTestResult(prev => ({ ...prev, [id]: { success: true, message: "Valid" } }));
      } else if (res?.status === 401 || res?.status === 403) {
        setTestResult(prev => ({ ...prev, [id]: { success: false, message: "Invalid key" } }));
      } else if (res?.status === 429) {
        setTestResult(prev => ({ ...prev, [id]: { success: false, message: "Rate limit" } }));
      } else {
        setTestResult(prev => ({ ...prev, [id]: { success: false, message: `Error ${res?.status}` } }));
      }
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { success: false, message: "Connection failed" } }));
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <ApiKeyContext.Provider value={{ keys, saveKeys, getKey, getAllKeys, testKey, testResult, setTestResult, testing, setTesting, storageMode, updateStorageMode, selectedModels, setSelectedModel }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeyProvider");
  }
  return context;
}
