const KEY_USER_DECKS = "lexibridge.userDecks.v1";
const KEY_OVERRIDES = "lexibridge.baseOverrides.v1";
const KEY_DELETED = "lexibridge.deletedDeckIds.v1";

const KEY_PROGRESS = "lexibridge.progress.v1";
const KEY_STREAK = "lexibridge.streak.v1";
const KEY_HISTORY = "lexibridge.history.v1";

function safeParse(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadUserDecks() {
  return safeParse(KEY_USER_DECKS, []);
}

export function saveUserDecks(decks) {
  localStorage.setItem(KEY_USER_DECKS, JSON.stringify(decks));
}

export function loadBaseOverrides() {
  return safeParse(KEY_OVERRIDES, {});
}

export function saveBaseOverrides(map) {
  localStorage.setItem(KEY_OVERRIDES, JSON.stringify(map));
}

export function loadDeletedDeckIds() {
  return safeParse(KEY_DELETED, []);
}

export function saveDeletedDeckIds(ids) {
  localStorage.setItem(KEY_DELETED, JSON.stringify(ids));
}

export function markDeckDeleted(deckId) {
  const ids = new Set(loadDeletedDeckIds());
  ids.add(deckId);
  saveDeletedDeckIds(Array.from(ids));
  const progress = loadProgress();
  delete progress[deckId];
  saveProgress(progress);
}

export function unmarkDeckDeleted(deckId) {
  const ids = new Set(loadDeletedDeckIds());
  ids.delete(deckId);
  saveDeletedDeckIds(Array.from(ids));
}

export function upsertDeckAnySource(deck, source = "user") {
  if (source === "base") {
    const map = loadBaseOverrides();
    map[deck.id] = deck;
    saveBaseOverrides(map);
    unmarkDeckDeleted(deck.id);
    return;
  }

  const decks = loadUserDecks();
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) decks[idx] = deck;
  else decks.unshift(deck);
  saveUserDecks(decks);
  unmarkDeckDeleted(deck.id);
}

export function deleteDeckAnySource(deckId) {
  const user = loadUserDecks().filter((d) => d.id !== deckId);
  saveUserDecks(user);

  const map = loadBaseOverrides();
  if (map[deckId]) {
    delete map[deckId];
    saveBaseOverrides(map);
  }

  markDeckDeleted(deckId);
}

export function loadProgress() {
  return safeParse(KEY_PROGRESS, {});
}

export function saveProgress(progress) {
  localStorage.setItem(KEY_PROGRESS, JSON.stringify(progress));
}

export function getDeckProgress(deckId) {
  const p = loadProgress();
  return p[deckId] || { known: {}, seen: 0, updatedAt: 0 };
}

export function setDeckProgress(deckId, data) {
  const p = loadProgress();
  p[deckId] = { ...data, updatedAt: Date.now() };
  saveProgress(p);
}

export function loadStreak() {
  return safeParse(KEY_STREAK, { count: 0, lastDay: "" });
}

export function bumpStreak() {
  const s = loadStreak();
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  if (s.lastDay === day) return s;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(
    yesterday.getDate()
  ).padStart(2, "0")}`;

  const next = { lastDay: day, count: s.lastDay === y ? s.count + 1 : 1 };
  localStorage.setItem(KEY_STREAK, JSON.stringify(next));
  return next;
}

export function loadHistory() {
  return safeParse(KEY_HISTORY, []);
}

export function saveHistory(items) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(items));
}

export function pushHistory(entry) {
  const items = loadHistory();
  const next = [
    {
      at: Date.now(),
      type: entry.type || "study",
      deckId: entry.deckId || "",
      action: entry.action || "",
      message: entry.message || ""
    },
    ...items
  ].slice(0, 250);
  saveHistory(next);
  return next;
}

export function clearHistory() {
  localStorage.removeItem(KEY_HISTORY);
}

export function exportAllData() {
  const payload = {
    version: 1,
    exportedAt: Date.now(),
    userDecks: loadUserDecks(),
    baseOverrides: loadBaseOverrides(),
    deletedDeckIds: loadDeletedDeckIds(),
    progress: loadProgress(),
    streak: loadStreak(),
    history: loadHistory()
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

export function importAllData(payload) {
  let decks = 0;
  let progress = 0;
  let history = 0;

  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.userDecks)) {
      saveUserDecks(payload.userDecks);
      decks += payload.userDecks.length;
    }
    if (payload.baseOverrides && typeof payload.baseOverrides === "object") {
      saveBaseOverrides(payload.baseOverrides);
      decks += Object.keys(payload.baseOverrides).length;
    }
    if (Array.isArray(payload.deletedDeckIds)) {
      saveDeletedDeckIds(payload.deletedDeckIds);
    }
    if (payload.progress && typeof payload.progress === "object") {
      saveProgress(payload.progress);
      progress = Object.keys(payload.progress).length;
    }
    if (payload.streak && typeof payload.streak === "object") {
      localStorage.setItem(KEY_STREAK, JSON.stringify(payload.streak));
    }
    if (Array.isArray(payload.history)) {
      saveHistory(payload.history.slice(0, 250));
      history = payload.history.length;
    }
  }

  return { decks, progress, history };
}

export function resetAll() {
  localStorage.removeItem(KEY_USER_DECKS);
  localStorage.removeItem(KEY_OVERRIDES);
  localStorage.removeItem(KEY_DELETED);
  localStorage.removeItem(KEY_PROGRESS);
  localStorage.removeItem(KEY_STREAK);
  localStorage.removeItem(KEY_HISTORY);
}