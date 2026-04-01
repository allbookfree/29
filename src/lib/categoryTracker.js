export function getAntiRepeatSample(type) {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`ph_${type}`);
    if (!raw) return [];
    const history = JSON.parse(raw);
    if (!Array.isArray(history)) return [];
    return history.slice(-15).map(p => typeof p === "string" ? p : String(p)).filter(p => p.length > 10);
  } catch {
    return [];
  }
}
