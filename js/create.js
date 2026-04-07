import { getAllDecks, getDeckById, isBaseDeck } from "./app.js";
import { qs, uid, getParam, setToast } from "./utils.js";
import { upsertDeckAnySource, deleteDeckAnySource } from "./storage.js";

const deckForm = qs("#deckForm");
const deckIdInput = qs("#deckId");
const deckName = qs("#deckName");
const deckLanguage = qs("#deckLanguage");
const deckCategory = qs("#deckCategory");
const deckDescription = qs("#deckDescription");

const deckNameError = qs("#deckNameError");
const deckLanguageError = qs("#deckLanguageError");
const deckCategoryError = qs("#deckCategoryError");

const cardRows = qs("#cardRows");
const addCardBtn = qs("#addCardBtn");
const addSampleBtn = qs("#addSampleBtn");
const deleteDeckBtn = qs("#deleteDeckBtn");
const studyDeckLink = qs("#studyDeckLink");
const cardCountText = qs("#cardCountText");
const deckLibraryList = qs("#deckLibraryList");
const confirmDialog = qs("#confirmDialog");

let activeDeckId = "";

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

function getFocusableElements(container) {
  const selectors =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selectors)).filter((node) => !node.hidden);
}

function trapDialogFocus(dialog) {
  const focusable = getFocusableElements(dialog);
  if (focusable.length > 0) {
    focusable[0].focus();
  }

  const keyHandler = (event) => {
    if (event.key !== "Tab") return;

    const items = getFocusableElements(dialog);
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  dialog.addEventListener("keydown", keyHandler, { once: false });

  dialog.addEventListener(
    "close",
    () => {
      dialog.removeEventListener("keydown", keyHandler);
    },
    { once: true }
  );
}

function setFieldState(input, errorElement, message = "") {
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function createCardRow(card = { id: uid("card"), term: "", meaning: "", example: "" }) {
  const row = document.createElement("div");
  row.className = "table-row";
  row.dataset.cardId = card.id;

  row.innerHTML = `
    <div class="field">
      <input class="input term" type="text" value="${escapeHtml(card.term)}" placeholder="Term" />
      <p class="error term-error"></p>
    </div>
    <div class="field">
      <input class="input meaning" type="text" value="${escapeHtml(card.meaning)}" placeholder="Meaning" />
      <p class="error meaning-error"></p>
    </div>
    <div class="field">
      <input class="input example" type="text" value="${escapeHtml(card.example || "")}" placeholder="Example (optional)" />
      <p class="help">Optional</p>
    </div>
    <div class="row-actions">
      <button class="btn btn-ghost move-up" type="button">Up</button>
      <button class="btn btn-ghost move-down" type="button">Down</button>
      <button class="btn btn-danger remove-row" type="button">Remove</button>
    </div>
  `;

  row.querySelector(".move-up").addEventListener("click", () => moveRow(row, -1));
  row.querySelector(".move-down").addEventListener("click", () => moveRow(row, 1));
  row.querySelector(".remove-row").addEventListener("click", () => {
    row.remove();
    updateCardCount();
  });

  return row;
}

function moveRow(row, direction) {
  const rows = Array.from(cardRows.children);
  const currentIndex = rows.indexOf(row);
  const nextIndex = currentIndex + direction;

  if (nextIndex < 0 || nextIndex >= rows.length) return;

  if (direction < 0) {
    cardRows.insertBefore(row, rows[nextIndex]);
  } else {
    cardRows.insertBefore(rows[nextIndex], row);
  }

  updateCardCount();
}

function updateCardCount() {
  const count = cardRows.children.length;
  cardCountText.textContent = `${count} cards`;
}

function clearFormValidation() {
  setFieldState(deckName, deckNameError, "");
  setFieldState(deckLanguage, deckLanguageError, "");
  setFieldState(deckCategory, deckCategoryError, "");
}

function validateForm() {
  let isValid = true;
  clearFormValidation();

  if (!deckName.value.trim() || deckName.value.trim().length < 2) {
    setFieldState(deckName, deckNameError, "Deck name is required and must be at least 2 characters.");
    isValid = false;
  }

  if (!deckLanguage.value) {
    setFieldState(deckLanguage, deckLanguageError, "Please choose a language.");
    isValid = false;
  }

  if (!deckCategory.value) {
    setFieldState(deckCategory, deckCategoryError, "Please choose a category.");
    isValid = false;
  }

  const rows = Array.from(cardRows.children);
  if (rows.length === 0) {
    setToast("Add at least one card.");
    isValid = false;
  }

  rows.forEach((row) => {
    const term = row.querySelector(".term");
    const meaning = row.querySelector(".meaning");
    const termError = row.querySelector(".term-error");
    const meaningError = row.querySelector(".meaning-error");

    termError.textContent = "";
    meaningError.textContent = "";

    if (!term.value.trim()) {
      termError.textContent = "Required.";
      isValid = false;
    }

    if (!meaning.value.trim()) {
      meaningError.textContent = "Required.";
      isValid = false;
    }
  });

  return isValid;
}

function collectDeckData() {
  const cards = Array.from(cardRows.children).map((row) => {
    return {
      id: row.dataset.cardId || uid("card"),
      term: row.querySelector(".term").value.trim(),
      meaning: row.querySelector(".meaning").value.trim(),
      example: row.querySelector(".example").value.trim()
    };
  });

  return {
    id: deckIdInput.value || uid("deck"),
    name: deckName.value.trim(),
    language: deckLanguage.value,
    category: deckCategory.value,
    description: deckDescription.value.trim(),
    cards
  };
}

function resetCardRows() {
  cardRows.innerHTML = "";
  updateCardCount();
}

function loadDeckIntoForm(deck) {
  activeDeckId = deck.id;
  deckIdInput.value = deck.id;
  deckName.value = deck.name || "";
  deckLanguage.value = deck.language || "";
  deckCategory.value = deck.category || "";
  deckDescription.value = deck.description || "";

  resetCardRows();
  (deck.cards || []).forEach((card) => {
    cardRows.appendChild(createCardRow(card));
  });

  studyDeckLink.href = `study.html?deck=${encodeURIComponent(deck.id)}`;
  updateCardCount();
  clearFormValidation();
}

function initNewDeck() {
  activeDeckId = "";
  deckIdInput.value = "";
  deckForm.reset();
  resetCardRows();
  cardRows.appendChild(createCardRow());
  studyDeckLink.href = "study.html";
  updateCardCount();
  clearFormValidation();
}

function createDeckLibraryCard(deck) {
  const article = document.createElement("article");
  article.className = "card";
  article.innerHTML = `
    <div class="card-top">
      <div>
        <h3>${escapeHtml(deck.name)}</h3>
        <p class="muted">${escapeHtml(deck.description || "No description")}</p>
      </div>
      <span class="badge">${escapeHtml(deck.language)} · ${escapeHtml(deck.category)}</span>
    </div>
    <div class="muted">Cards: ${(deck.cards || []).length}</div>
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
      <a class="btn btn-ghost" href="study.html?deck=${encodeURIComponent(deck.id)}">Study</a>
      <button class="btn btn-primary edit-deck-btn" type="button">Edit</button>
    </div>
  `;

  article.querySelector(".edit-deck-btn").addEventListener("click", () => {
    loadDeckIntoForm(deck);
    setToast(`Loaded ${deck.name}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  return article;
}

async function renderDeckLibrary() {
  const decks = await getAllDecks();
  deckLibraryList.innerHTML = "";

  if (decks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "panel";
    empty.textContent = "No decks available yet.";
    deckLibraryList.appendChild(empty);
    return;
  }

  decks.forEach((deck) => {
    deckLibraryList.appendChild(createDeckLibraryCard(deck));
  });
}

async function openDeckFromUrl() {
  const deckId = getParam("deck");
  if (!deckId) {
    initNewDeck();
    return;
  }

  const deck = await getDeckById(deckId);
  if (!deck) {
    initNewDeck();
    setToast("Deck not found. Starting a new one.");
    return;
  }

  loadDeckIntoForm(deck);
}

async function handleSave(event) {
  event.preventDefault();

  if (!validateForm()) {
    setToast("Fix validation errors before saving.");
    return;
  }

  const deck = collectDeckData();
  const isBase = await isBaseDeck(deck.id);

  upsertDeckAnySource(deck, isBase ? "base" : "user");
  activeDeckId = deck.id;
  deckIdInput.value = deck.id;
  studyDeckLink.href = `study.html?deck=${encodeURIComponent(deck.id)}`;

  await renderDeckLibrary();
  setToast("Deck saved.");
}

async function handleDelete() {
  const deckId = deckIdInput.value || activeDeckId;
  if (!deckId) {
    setToast("There is no deck to delete.");
    return;
  }

  if (typeof confirmDialog.showModal === "function") {
    confirmDialog.showModal();
    trapDialogFocus(confirmDialog);

    const result = await new Promise((resolve) => {
      confirmDialog.addEventListener(
        "close",
        () => resolve(confirmDialog.returnValue),
        { once: true }
      );
    });

    if (result !== "confirm") return;
  } else {
    const approved = window.confirm("Delete this deck?");
    if (!approved) return;
  }

  deleteDeckAnySource(deckId);
  initNewDeck();
  await renderDeckLibrary();
  setToast("Deck deleted.");
}

function initButtons() {
  addCardBtn.addEventListener("click", () => {
    cardRows.appendChild(createCardRow());
    updateCardCount();
  });

  addSampleBtn.addEventListener("click", () => {
    cardRows.appendChild(
      createCardRow({
        id: uid("card"),
        term: "Hello",
        meaning: "안녕하세요",
        example: "Hello, nice to meet you."
      })
    );
    cardRows.appendChild(
      createCardRow({
        id: uid("card"),
        term: "Thank you",
        meaning: "감사합니다",
        example: "Thank you for your help."
      })
    );
    updateCardCount();
    setToast("Sample cards added.");
  });

  deleteDeckBtn.addEventListener("click", handleDelete);
  deckForm.addEventListener("submit", handleSave);
}

async function init() {
  initButtons();
  await openDeckFromUrl();
  await renderDeckLibrary();
}

init().catch((error) => {
  console.error(error);
  setToast("Failed to load the deck page.");
});