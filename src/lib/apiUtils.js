const MAX_API_KEYS = 10;

export const DEFAULT_REQUEST_TIMEOUT_MS = 60000;

export function jsonError(message, status, code) {
  return Response.json({ error: message, code }, { status });
}

export function sanitizeKeys(apiKeys) {
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

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
