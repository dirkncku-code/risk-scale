const KEY = 'dk-risk-scale-v1';

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  localStorage.setItem(KEY, JSON.stringify({ ...draft, version: 1, updatedAt: new Date().toISOString() }));
}

export function clearDraft() {
  localStorage.removeItem(KEY);
}
