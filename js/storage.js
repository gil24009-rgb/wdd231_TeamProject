const KEY_USER_DECKS = "lexibridge.userDecks.v1";
const KEY_BASE_OVERRIDES = "lexibridge.baseOverrides.v1";
const KEY_DELETED_IDS = "lexibridge.deletedDeckIds.v1";
const KEY_PROGRESS = "lexibridge.progress.v1";
const KEY_HISTORY = "lexibridge.history.v1";

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
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
  return safeParse(KEY_BASE_OVERRIDES, {});
}

export function saveBaseOverrides(overrides) {
  localStorage.setItem(KEY_BASE_OVERRIDES, JSON.stringify(overrides));
}

export function loadDeletedDeckIds() {
  return safeParse(KEY_DELETED_IDS, []);
}

export function saveDeletedDeckIds(ids) {
  localStorage.setItem(KEY_DELETED_IDS, JSON.stringify(ids));
}

export function loadProgress() {
  return safeParse(KEY_PROGRESS, {});
}

export function saveProgress(progress) {
  localStorage.setItem(KEY_PROGRESS, JSON.stringify(progress));
}

export function getDeckProgress(deckId) {
  const progress = loadProgress();
  return progress[deckId] || { known: {}, seen: 0, updatedAt: 0 };
}

export function setDeckProgress(deckId, deckProgress) {
  const progress = loadProgress();
  progress[deckId] = {
    known: deckProgress.known || {},
    seen: deckProgress.seen || 0,
    updatedAt: deckProgress.updatedAt || Date.now()
  };
  saveProgress(progress);
}

export function loadHistory() {
  return safeParse(KEY_HISTORY, []);
}

export function saveHistory(history) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
}

export function pushHistory(entry) {
  const history = loadHistory();
  const nextEntry = {
    at: Date.now(),
    type: entry.type || "study",
    deckId: entry.deckId || "",
    action: entry.action || "",
    message: entry.message || ""
  };

  const nextHistory = [nextEntry, ...history].slice(0, 250);
  saveHistory(nextHistory);
  return nextHistory;
}

export function upsertDeckAnySource(deck, source = "user") {
  if (source === "base") {
    const overrides = loadBaseOverrides();
    overrides[deck.id] = deck;
    saveBaseOverrides(overrides);

    const deletedIds = loadDeletedDeckIds().filter((id) => id !== deck.id);
    saveDeletedDeckIds(deletedIds);

    pushHistory({
      type: "deck",
      deckId: deck.id,
      action: "save-base",
      message: `Updated base deck override for ${deck.name}.`
    });

    return;
  }

  const userDecks = loadUserDecks();
  const existingIndex = userDecks.findIndex((item) => item.id === deck.id);

  if (existingIndex >= 0) {
    userDecks[existingIndex] = deck;
  } else {
    userDecks.unshift(deck);
  }

  saveUserDecks(userDecks);

  const deletedIds = loadDeletedDeckIds().filter((id) => id !== deck.id);
  saveDeletedDeckIds(deletedIds);

  pushHistory({
    type: "deck",
    deckId: deck.id,
    action: "save-user",
    message: `Saved user deck ${deck.name}.`
  });
}

export function deleteDeckAnySource(deckId) {
  const userDecks = loadUserDecks().filter((deck) => deck.id !== deckId);
  saveUserDecks(userDecks);

  const overrides = loadBaseOverrides();
  if (overrides[deckId]) {
    delete overrides[deckId];
    saveBaseOverrides(overrides);
  }

  const deletedIds = new Set(loadDeletedDeckIds());
  deletedIds.add(deckId);
  saveDeletedDeckIds(Array.from(deletedIds));

  const progress = loadProgress();
  if (progress[deckId]) {
    delete progress[deckId];
    saveProgress(progress);
  }

  pushHistory({
    type: "deck",
    deckId,
    action: "delete",
    message: `Deleted deck ${deckId}.`
  });
}