const TRACKER_KEY_PREFIX = "cat_tracker_";
const SUBJECT_KEY_PREFIX = "subj_tracker_";
const MAX_SUBJECT_HISTORY = 500;

function getKey(type) {
  return `${TRACKER_KEY_PREFIX}${type}`;
}

function getSubjectKey(type) {
  return `${SUBJECT_KEY_PREFIX}${type}`;
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

export function getUsedSubjects(type) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(getSubjectKey(type));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
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

export function recordUsedSubjects(type, subjectKeys) {
  if (typeof window === "undefined") return;
  try {
    const existing = getUsedSubjects(type);
    for (const key of subjectKeys) {
      existing.add(key);
    }
    let arr = [...existing];
    if (arr.length > MAX_SUBJECT_HISTORY) {
      arr = arr.slice(arr.length - MAX_SUBJECT_HISTORY);
    }
    localStorage.setItem(getSubjectKey(type), JSON.stringify(arr));
  } catch {}
}

export function getUsageStats(type) {
  const usage = getCategoryUsage(type);
  const totalCategories = Object.keys(usage).length;
  const totalUsed = Object.values(usage).reduce((s, v) => s + v, 0);
  const leastUsed = totalCategories > 0 ? Math.min(...Object.values(usage)) : 0;
  const mostUsed = totalCategories > 0 ? Math.max(...Object.values(usage)) : 0;
  const subjectsUsed = getUsedSubjects(type).size;
  return { totalCategories, totalUsed, leastUsed, mostUsed, subjectsUsed };
}

export function resetCategoryUsage(type) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getKey(type));
    localStorage.removeItem(getSubjectKey(type));
  } catch {}
}
