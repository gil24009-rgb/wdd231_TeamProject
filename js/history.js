import { getAllDecks } from "./app.js";
import { loadProgress, loadHistory } from "./storage.js";
import { qs } from "./utils.js";

const historyLanguageTabs = qs("#historyLanguageTabs");
const historyAccordion = qs("#historyAccordion");

let allDecks = [];
let progressMap = {};
let historyLog = [];
let activeLanguage = "English";

const categories = ["Basics", "Travel", "School", "Daily"];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[char] || char;
  });
}

function getDeckHistoryCount(deckId) {
  return historyLog.filter((entry) => entry.deckId === deckId && entry.type === "study").length;
}

function buildCategoryDecks(language, category) {
  return allDecks
    .filter((deck) => deck.language === language && deck.category === category)
    .map((deck) => {
      const progress = progressMap[deck.id] || { known: {}, seen: 0 };
      const totalCards = (deck.cards || []).length;
      const knownCount = Object.keys(progress.known || {}).length;
      const seenCount = progress.seen || 0;
      const completion = totalCards > 0 ? Math.round((knownCount / totalCards) * 100) : 0;
      const historyCount = getDeckHistoryCount(deck.id);

      return {
        ...deck,
        totalCards,
        knownCount,
        seenCount,
        completion,
        historyCount
      };
    });
}

function createDeckItem(deck) {
  const item = document.createElement("div");
  item.className = "history-deck-item";
  item.innerHTML = `
    <div class="history-deck-top">
      <div class="history-deck-name">${escapeHtml(deck.name)}</div>
      <span class="badge">${escapeHtml(deck.category)}</span>
    </div>
    <div class="history-deck-stats">
      <div class="history-stat">
        <span class="history-stat-label">Study actions</span>
        <span class="history-stat-value">${deck.historyCount}</span>
      </div>
      <div class="history-stat">
        <span class="history-stat-label">Known cards</span>
        <span class="history-stat-value">${deck.knownCount} / ${deck.totalCards}</span>
      </div>
      <div class="history-stat">
        <span class="history-stat-label">Completion</span>
        <span class="history-stat-value">${deck.completion}%</span>
      </div>
    </div>
  `;
  return item;
}

function createCategoryCard(language, category) {
  const decks = buildCategoryDecks(language, category);

  const card = document.createElement("section");
  card.className = "history-category-card";

  const totalDecks = decks.length;
  const studiedDecks = decks.filter((deck) => deck.historyCount > 0 || deck.knownCount > 0).length;

  card.innerHTML = `
    <button class="history-category-toggle" type="button" aria-expanded="false">
      <span class="history-category-title">
        <span class="history-category-name">${escapeHtml(category)}</span>
        <span class="history-category-meta">${studiedDecks} active decks · ${totalDecks} total decks</span>
      </span>
      <span class="history-chevron" aria-hidden="true">⌄</span>
    </button>
    <div class="history-category-body"></div>
  `;

  const toggle = card.querySelector(".history-category-toggle");
  const body = card.querySelector(".history-category-body");

  if (decks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No decks available in this category.";
    body.appendChild(empty);
  } else {
    decks.forEach((deck) => {
      body.appendChild(createDeckItem(deck));
    });
  }

  toggle.addEventListener("click", () => {
    const isOpen = card.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  return card;
}

function renderLanguageTabs() {
  const buttons = Array.from(historyLanguageTabs.querySelectorAll(".language-tab"));
  buttons.forEach((button) => {
    const isActive = button.dataset.language === activeLanguage;
    button.classList.toggle("is-active", isActive);
  });
}

function renderAccordion() {
  historyAccordion.innerHTML = "";
  categories.forEach((category) => {
    historyAccordion.appendChild(createCategoryCard(activeLanguage, category));
  });
}

function initLanguageTabs() {
  historyLanguageTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".language-tab");
    if (!button) return;

    activeLanguage = button.dataset.language;
    renderLanguageTabs();
    renderAccordion();
  });
}

async function init() {
  allDecks = await getAllDecks();
  progressMap = loadProgress();
  historyLog = loadHistory();

  renderLanguageTabs();
  renderAccordion();
  initLanguageTabs();
}

init().catch((error) => {
  console.error(error);
  historyAccordion.innerHTML = `<div class="history-empty">Failed to load history view.</div>`;
});