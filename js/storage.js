const KEY_USER_DECKS = "lexibridge.userDecks.v1";
const KEY_PROGRESS = "lexibridge.progress.v1";
const KEY_STREAK = "lexibridge.streak.v1";

export function loadUserDecks() {
  try {
    return JSON.parse(localStorage.getItem(KEY_USER_DECKS)) || [];
  } catch {
    return [];
  }
}

export function saveUserDecks(decks) {
  localStorage.setItem(KEY_USER_DECKS, JSON.stringify(decks));
}

export function upsertUserDeck(deck) {
  const decks = loadUserDecks();
  const idx = decks.findIndex((d) => d.id === deck.id);
  if (idx >= 0) decks[idx] = deck;
  else decks.unshift(deck);
  saveUserDecks(decks);
  return decks;
}

export function deleteUserDeck(deckId) {
  const decks = loadUserDecks().filter((d) => d.id !== deckId);
  saveUserDecks(decks);

  const progress = loadProgress();
  delete progress[deckId];
  saveProgress(progress);

  return decks;
}

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(KEY_PROGRESS)) || {};
  } catch {
    return {};
  }
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
  try {
    return JSON.parse(localStorage.getItem(KEY_STREAK)) || { count: 0, lastDay: "" };
  } catch {
    return { count: 0, lastDay: "" };
  }
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

export function resetAll() {
  localStorage.removeItem(KEY_USER_DECKS);
  localStorage.removeItem(KEY_PROGRESS);
  localStorage.removeItem(KEY_STREAK);
}