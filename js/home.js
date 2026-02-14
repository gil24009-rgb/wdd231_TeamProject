import { getAllDecks } from "./app.js";
import { qs, normalize, setToast } from "./utils.js";
import { loadProgress, loadStreak, resetAll } from "./storage.js";

const deckList = qs("#deckList");
const filterLanguage = qs("#filterLanguage");
const filterCategory = qs("#filterCategory");
const searchDecks = qs("#searchDecks");
const resetDemo = qs("#resetDemo");

const statDecks = qs("#statDecks");
const statCards = qs("#statCards");
const statStreak = qs("#statStreak");

let decks = [];

function countCards(list) {
  return list.reduce((sum, d) => sum + (d.cards?.length || 0), 0);
}

function deckCard(deck) {
  const a = document.createElement("article");
  a.className = "card";

  const progress = loadProgress()[deck.id];
  const knownCount = progress ? Object.keys(progress.known || {}).length : 0;
  const total = deck.cards?.length || 0;

  a.innerHTML = `
    <div class="card-top">
      <div>
        <h3>${escapeHtml(deck.name)}</h3>
        <p class="muted">${escapeHtml(deck.description || "")}</p>
      </div>
      <span class="badge">${escapeHtml(deck.language)} · ${escapeHtml(deck.category)}</span>
    </div>

    <div class="muted">Cards: ${total} · Known: ${knownCount}</div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn btn-primary" href="study.html?deck=${encodeURIComponent(deck.id)}">Study</a>
      <a class="btn btn-ghost" href="create.html?deck=${encodeURIComponent(deck.id)}">Edit</a>
    </div>
  `;
  return a;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c] || c;
  });
}

function applyFilters() {
  const lang = filterLanguage.value;
  const cat = filterCategory.value;
  const q = normalize(searchDecks.value);

  const filtered = decks.filter((d) => {
    const okLang = lang === "all" || d.language === lang;
    const okCat = cat === "all" || d.category === cat;
    const okQ = !q || normalize(d.name).includes(q);
    return okLang && okCat && okQ;
  });

  deckList.innerHTML = "";
  for (const d of filtered) deckList.appendChild(deckCard(d));

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "panel";
    empty.textContent = "No decks match your filters.";
    deckList.appendChild(empty);
  }
}

async function init() {
  decks = await getAllDecks();

  statDecks.textContent = String(decks.length);
  statCards.textContent = String(countCards(decks));
  statStreak.textContent = String(loadStreak().count);

  applyFilters();

  filterLanguage.addEventListener("change", applyFilters);
  filterCategory.addEventListener("change", applyFilters);
  searchDecks.addEventListener("input", applyFilters);

  resetDemo.addEventListener("click", () => {
    resetAll();
    setToast("Demo data reset. Reloading.");
    window.setTimeout(() => window.location.reload(), 450);
  });
}

init().catch((e) => {
  deckList.innerHTML = `<div class="panel">Error: ${String(e.message || e)}</div>`;
});