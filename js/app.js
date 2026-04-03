import { fetchBaseDecks } from "./api.js";
import {
  loadUserDecks,
  loadBaseOverrides,
  loadDeletedDeckIds
} from "./storage.js";

export async function loadDecks() {
  try {
    // Try API first (replace with real API URL if available)
    const response = await fetch('https://api.example.com/decks'); // Example API endpoint
    if (response.ok) {
      const data = await response.json();
      return data.decks || [];
    }
  } catch (e) {
    console.warn('API fetch failed, falling back to local JSON:', e);
  }
  
  const response = await fetch('./data/decks.json');
  const data = await response.json();
  return data.decks || [];
}

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
