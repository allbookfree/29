const TRACKER_KEY_PREFIX = "cat_tracker_";
const MAX_HISTORY_PER_TYPE = 2000;

function getKey(type) {
  return `${TRACKER_KEY_PREFIX}${type}`;
}

export function getCategoryUsage(type) {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getKey(type));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordCategoryUsage(type, category) {
  if (typeof window === "undefined") return;
  try {
    const usage = getCategoryUsage(type);
    usage[category] = (usage[category] || 0) + 1;
    localStorage.setItem(getKey(type), JSON.stringify(usage));
  } catch {}
}

export function recordMultipleCategoryUsage(type, categories) {
  if (typeof window === "undefined") return;
  try {
    const usage = getCategoryUsage(type);
    for (const cat of categories) {
      usage[cat] = (usage[cat] || 0) + 1;
    }
    localStorage.setItem(getKey(type), JSON.stringify(usage));
  } catch {}
}

export function getUsageStats(type) {
  const usage = getCategoryUsage(type);
  const totalCategories = Object.keys(usage).length;
  const totalUsed = Object.values(usage).reduce((s, v) => s + v, 0);
  const leastUsed = totalCategories > 0 ? Math.min(...Object.values(usage)) : 0;
  const mostUsed = totalCategories > 0 ? Math.max(...Object.values(usage)) : 0;
  return { totalCategories, totalUsed, leastUsed, mostUsed };
}

export function resetCategoryUsage(type) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(type));
  } catch {}
}
