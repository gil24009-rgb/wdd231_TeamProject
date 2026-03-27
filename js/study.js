import { getAllDecks, getDeckById } from "./app.js";
import { qs, getParam, clamp, setToast } from "./utils.js";
import { getDeckProgress, setDeckProgress } from "./storage.js";

const studyLanguageFilter = qs("#studyLanguageFilter");
const studyCategoryFilter = qs("#studyCategoryFilter");
const studyDeckSelect = qs("#studyDeckSelect");

const deckTitle = qs("#deckTitle");
const deckMeta = qs("#deckMeta");
const flipCard = qs("#flipCard");
const termText = qs("#termText");
const meaningText = qs("#meaningText");
const exampleText = qs("#exampleText");

const knownBtn = qs("#knownBtn");
const againBtn = qs("#againBtn");

const progressText = qs("#progressText");
const knownText = qs("#knownText");
const progressPercentText = qs("#progressPercentText");
const progressFill = qs("#progressFill");

let allDecks = [];
let filteredDecks = [];
let activeDeck = null;
let activeCards = [];
let currentIndex = 0;
let knownSet = new Set();

function shuffleCards(cards) {
  return cards.map((card) => ({ ...card }));
}

function renderDeckOptions() {
  const selectedId = activeDeck?.id || studyDeckSelect.value || "";

  studyDeckSelect.innerHTML = `<option value="">Select a deck</option>`;

  filteredDecks.forEach((deck) => {
    const option = document.createElement("option");
    option.value = deck.id;
    option.textContent = `${deck.name} · ${deck.language} · ${deck.category}`;
    if (deck.id === selectedId) option.selected = true;
    studyDeckSelect.appendChild(option);
  });
}

function applyFilters() {
  const language = studyLanguageFilter.value;
  const category = studyCategoryFilter.value;

  filteredDecks = allDecks.filter((deck) => {
    const matchLanguage = language === "all" || deck.language === language;
    const matchCategory = category === "all" || deck.category === category;
    return matchLanguage && matchCategory;
  });

  renderDeckOptions();

  if (!filteredDecks.some((deck) => deck.id === activeDeck?.id)) {
    if (filteredDecks.length > 0) {
      loadDeck(filteredDecks[0].id);
      studyDeckSelect.value = filteredDecks[0].id;
    } else {
      clearStudyState();
    }
  }
}

function clearStudyState() {
  activeDeck = null;
  activeCards = [];
  currentIndex = 0;
  knownSet = new Set();

  deckTitle.textContent = "Study";
  deckMeta.textContent = "No deck matches the selected filters.";
  termText.textContent = "...";
  meaningText.textContent = "...";
  exampleText.textContent = "";
  progressText.textContent = "0 of 0";
  knownText.textContent = "Known 0";
  progressPercentText.textContent = "0%";
  progressFill.style.width = "0%";
  flipCard.classList.remove("is-flipped");
}

function renderCard() {
  const card = activeCards[currentIndex];
  if (!card) {
    termText.textContent = "Done";
    meaningText.textContent = "You finished this deck.";
    exampleText.textContent = "";
    return;
  }

  termText.textContent = card.term;
  meaningText.textContent = card.meaning;
  exampleText.textContent = card.example || "";
  flipCard.classList.remove("is-flipped");
}

function updateProgress() {
  const total = activeCards.length;
  const current = total > 0 ? clamp(currentIndex + 1, 0, total) : 0;
  const completion = total > 0 ? Math.round((current / total) * 100) : 0;

  progressText.textContent = `${current} of ${total}`;
  knownText.textContent = `Known ${knownSet.size}`;
  progressPercentText.textContent = `${completion}%`;
  progressFill.style.width = `${completion}%`;
}

function persistProgress() {
  if (!activeDeck) return;

  const known = {};
  knownSet.forEach((cardId) => {
    known[cardId] = true;
  });

  setDeckProgress(activeDeck.id, {
    known,
    seen: currentIndex + 1,
    updatedAt: Date.now()
  });
}

function loadDeck(deckId) {
  const deck = allDecks.find((item) => item.id === deckId);
  if (!deck) {
    clearStudyState();
    return;
  }

  activeDeck = deck;
  activeCards = shuffleCards(deck.cards || []);
  currentIndex = 0;

  const progress = getDeckProgress(deck.id);
  knownSet = new Set(Object.keys(progress.known || {}));

  deckTitle.textContent = deck.name;
  deckMeta.textContent = `${deck.language} · ${deck.category} · ${(deck.cards || []).length} cards`;

  renderCard();
  updateProgress();
}

function goNextCard() {
  if (!activeDeck || activeCards.length === 0) return;

  if (currentIndex < activeCards.length - 1) {
    currentIndex += 1;
    renderCard();
    updateProgress();
    persistProgress();
    return;
  }

  persistProgress();
  setToast("You reached the end of this deck.");
}

function handleKnown() {
  const currentCard = activeCards[currentIndex];
  if (!currentCard) return;

  knownSet.add(currentCard.id);
  goNextCard();
}

function handleAgain() {
  goNextCard();
}

async function initDeckState() {
  allDecks = await getAllDecks();

  const urlDeckId = getParam("deck");
  let initialDeck = null;

  if (urlDeckId) {
    initialDeck = await getDeckById(urlDeckId);
  }

  if (initialDeck) {
    studyLanguageFilter.value = initialDeck.language;
    studyCategoryFilter.value = initialDeck.category;
  }

  applyFilters();

  if (initialDeck && filteredDecks.some((deck) => deck.id === initialDeck.id)) {
    studyDeckSelect.value = initialDeck.id;
    loadDeck(initialDeck.id);
  } else if (filteredDecks.length > 0) {
    studyDeckSelect.value = filteredDecks[0].id;
    loadDeck(filteredDecks[0].id);
  } else {
    clearStudyState();
  }
}

function initEvents() {
  studyLanguageFilter.addEventListener("change", applyFilters);
  studyCategoryFilter.addEventListener("change", applyFilters);

  studyDeckSelect.addEventListener("change", () => {
    if (!studyDeckSelect.value) {
      clearStudyState();
      return;
    }
    loadDeck(studyDeckSelect.value);
  });

  flipCard.addEventListener("click", () => {
    if (!activeDeck) return;
    flipCard.classList.toggle("is-flipped");
  });

  flipCard.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flipCard.click();
    }
  });

  knownBtn.addEventListener("click", handleKnown);
  againBtn.addEventListener("click", handleAgain);
}

async function init() {
  initEvents();
  await initDeckState();
}

init().catch((error) => {
  console.error(error);
  setToast("Failed to load the study page.");
});