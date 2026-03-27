import { fetchBaseDecks } from "./api.js";
import {
  loadUserDecks,
  loadBaseOverrides,
  loadDeletedDeckIds
} from "./storage.js";

export async function getAllDecks() {
  const baseDecks = await fetchBaseDecks();
  const userDecks = loadUserDecks();
  const overrides = loadBaseOverrides();
  const deletedIds = new Set(loadDeletedDeckIds());

  const mergedBaseDecks = baseDecks
    .filter((deck) => !deletedIds.has(deck.id))
    .map((deck) => overrides[deck.id] || deck);

  const mergedUserDecks = userDecks.filter((deck) => !deletedIds.has(deck.id));

  const allDecks = [...mergedUserDecks];

  mergedBaseDecks.forEach((deck) => {
    const exists = allDecks.some((item) => item.id === deck.id);
    if (!exists) {
      allDecks.push(deck);
    }
  });

  return allDecks.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDeckById(deckId) {
  const decks = await getAllDecks();
  return decks.find((deck) => deck.id === deckId) || null;
}

export async function isBaseDeck(deckId) {
  const baseDecks = await fetchBaseDecks();
  return baseDecks.some((deck) => deck.id === deckId);
}