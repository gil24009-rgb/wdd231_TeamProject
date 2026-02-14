import { fetchBaseDecks } from "./api.js";
import { loadUserDecks } from "./storage.js";

export async function getAllDecks() {
  const base = await fetchBaseDecks();
  const user = loadUserDecks();

  const merged = [...user];
  for (const d of base) {
    if (!merged.some((x) => x.id === d.id)) merged.push(d);
  }
  return merged;
}

export async function getDeckById(deckId) {
  const decks = await getAllDecks();
  return decks.find((d) => d.id === deckId) || null;
}