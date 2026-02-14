import { getDeckById } from "./app.js";
import { qs, getParam, setToast, clamp, normalize } from "./utils.js";
import { getDeckProgress, setDeckProgress, bumpStreak } from "./storage.js";

const deckTitle = qs("#deckTitle");
const deckMeta = qs("#deckMeta");
const modeSelect = qs("#modeSelect");
const shuffleBtn = qs("#shuffleBtn");
const editDeckLink = qs("#editDeckLink");

const flipWrap = qs("#flipWrap");
const quizWrap = qs("#quizWrap");

const flipCard = qs("#flipCard");
const termText = qs("#termText");
const meaningText = qs("#meaningText");
const exampleText = qs("#exampleText");

const knownBtn = qs("#knownBtn");
const againBtn = qs("#againBtn");

const progressText = qs("#progressText");
const knownText = qs("#knownText");
const progressFill = qs("#progressFill");

const quizTerm = qs("#quizTerm");
const quizForm = qs("#quizForm");
const quizAnswer = qs("#quizAnswer");
const quizReveal = qs("#quizReveal");
const quizFeedback = qs("#quizFeedback");

let deck = null;
let list = [];
let index = 0;
let knownSet = new Set();

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function currentCard() {
  return list[index] || null;
}

function renderFlip() {
  const c = currentCard();
  if (!c) return;

  flipCard.classList.remove("is-flipped");
  termText.textContent = c.term;
  meaningText.textContent = c.meaning;
  exampleText.textContent = c.example ? c.example : "";
}

function renderQuiz() {
  const c = currentCard();
  if (!c) return;

  quizTerm.textContent = c.term;
  quizAnswer.value = "";
  quizFeedback.textContent = "";
  quizAnswer.focus();
}

function updateProgress() {
  const total = list.length;
  const seen = clamp(index + 1, 0, total);
  progressText.textContent = `${seen} of ${total}`;
  knownText.textContent = `Known ${knownSet.size}`;
  const pct = total ? Math.round((seen / total) * 100) : 0;
  progressFill.style.width = `${pct}%`;
}

function persistProgress() {
  const data = getDeckProgress(deck.id);
  const knownObj = {};
  for (const id of knownSet) knownObj[id] = true;

  setDeckProgress(deck.id, {
    known: knownObj,
    seen: index + 1,
    updatedAt: Date.now()
  });
}

function nextCard() {
  if (index < list.length - 1) {
    index += 1;
    updateModeView();
    updateProgress();
    persistProgress();
    return;
  }

  bumpStreak();
  setToast("Deck complete. Nice work.");
  updateProgress();
  persistProgress();
}

function markKnown() {
  const c = currentCard();
  if (!c) return;
  knownSet.add(c.id);
  nextCard();
}

function markAgain() {
  nextCard();
}

function updateModeView() {
  const mode = modeSelect.value;
  if (mode === "quiz") {
    flipWrap.hidden = true;
    quizWrap.hidden = false;
    renderQuiz();
  } else {
    quizWrap.hidden = true;
    flipWrap.hidden = false;
    renderFlip();
  }
}

async function init() {
  const deckId = getParam("deck") || "core-es";
  deck = await getDeckById(deckId);

  if (!deck) {
    deckTitle.textContent = "Deck not found";
    deckMeta.textContent = "Go back to Home and pick a valid deck.";
    flipWrap.hidden = true;
    quizWrap.hidden = true;
    return;
  }

  deckTitle.textContent = deck.name;
  deckMeta.textContent = `${deck.language} · ${deck.category} · ${deck.cards.length} cards`;

  editDeckLink.href = `create.html?deck=${encodeURIComponent(deck.id)}`;

  list = deck.cards.map((c) => ({ ...c }));
  const saved = getDeckProgress(deck.id);
  knownSet = new Set(Object.keys(saved.known || {}));
  index = 0;

  updateModeView();
  updateProgress();

  flipCard.addEventListener("click", () => {
    flipCard.classList.toggle("is-flipped");
  });

  flipCard.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      flipCard.click();
    }
  });

  knownBtn.addEventListener("click", markKnown);
  againBtn.addEventListener("click", markAgain);

  shuffleBtn.addEventListener("click", () => {
    list = shuffle(list);
    index = 0;
    setToast("Shuffled.");
    updateModeView();
    updateProgress();
    persistProgress();
  });

  modeSelect.addEventListener("change", () => {
    updateModeView();
  });

  quizForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const c = currentCard();
    if (!c) return;

    const user = normalize(quizAnswer.value);
    const target = normalize(c.meaning);

    if (!user) {
      quizFeedback.textContent = "Type an answer first.";
      return;
    }

    if (user === target) {
      quizFeedback.textContent = "Correct.";
      knownSet.add(c.id);
      nextCard();
    } else {
      quizFeedback.textContent = `Not quite. Try again.`;
      quizAnswer.select();
    }
  });

  quizReveal.addEventListener("click", () => {
    const c = currentCard();
    if (!c) return;
    quizFeedback.textContent = `Answer: ${c.meaning}`;
    setToast("Revealed.");
  });
}

init().catch((e) => {
  deckTitle.textContent = "Error";
  deckMeta.textContent = String(e.message || e);
});