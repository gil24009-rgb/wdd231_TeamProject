export async function fetchBaseDecks() {
  const res = await fetch("data/decks.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load decks.json");
  const data = await res.json();
  return data.decks || [];
}