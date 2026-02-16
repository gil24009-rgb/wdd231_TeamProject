import { fetchBaseDecks } from "./api.js";
import { loadUserDecks, loadBaseOverrides, loadDeletedDeckIds } from "./storage.js";

export async function getAllDecks() {
  const base = await fetchBaseDecks();
  const user = loadUserDecks();
  const overrides = loadBaseOverrides();
  const deleted = new Set(loadDeletedDeckIds());

  const baseFiltered = base.filter((d) => !deleted.has(d.id)).map((d) => {
    return overrides[d.id] ? overrides[d.id] : d;
  });

  const userFiltered = user.filter((d) => !deleted.has(d.id));

  const merged = [...userFiltered];

  for (const d of baseFiltered) {
    if (!merged.some((x) => x.id === d.id)) merged.push(d);
  }

  return merged;
}

export async function getDeckById(deckId) {
  const decks = await getAllDecks();
  return decks.find((d) => d.id === deckId) || null;
}

export async function isBaseDeck(deckId) {
  const base = await fetchBaseDecks();
  return base.some((d) => d.id === deckId);
}