import { getDeckById } from "./app.js";
import { qs, getParam, uid, setToast } from "./utils.js";
import { upsertUserDeck, deleteUserDeck } from "./storage.js";

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

const cardCountText = qs("#cardCountText");
const deleteDeckBtn = qs("#deleteDeckBtn");
const studyDeckLink = qs("#studyDeckLink");

const confirmDialog = qs("#confirmDialog");

let currentDeck = null;

function cardRowTemplate(card) {
  const row = document.createElement("div");
  row.className = "table-row";
  row.dataset.cardId = card.id;

  row.innerHTML = `
    <div class="field">
      <input class="input term" type="text" required minlength="1" maxlength="40" value="${escapeAttr(
        card.term
      )}" placeholder="Term" />
      <p class="error term-error"></p>
    </div>

    <div class="field">
      <input class="input meaning" type="text" required minlength="1" maxlength="60" value="${escapeAttr(
        card.meaning
      )}" placeholder="Meaning" />
      <p class="error meaning-error"></p>
    </div>

    <div class="field">
      <input class="input example" type="text" maxlength="90" value="${escapeAttr(
        card.example || ""
      )}" placeholder="Example (optional)" />
      <p class="help">Optional</p>
    </div>

    <div class="row-actions">
      <button class="btn btn-ghost move-up" type="button">Up</button>
      <button class="btn btn-ghost move-down" type="button">Down</button>
      <button class="btn btn-danger remove" type="button">Remove</button>
    </div>
  `;

  row.querySelector(".move-up").addEventListener("click", () => moveRow(row, -1));
  row.querySelector(".move-down").addEventListener("click", () => moveRow(row, 1));
  row.querySelector(".remove").addEventListener("click", () => {
    row.remove();
    updateCount();
  });

  return row;
}

function escapeAttr(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c] || c;
  });
}

function moveRow(row, dir) {
  const rows = Array.from(cardRows.children);
  const i = rows.indexOf(row);
  const j = i + dir;
  if (j < 0 || j >= rows.length) return;

  if (dir < 0) cardRows.insertBefore(row, rows[j]);
  else cardRows.insertBefore(rows[j], row);

  updateCount();
}

function updateCount() {
  const n = cardRows.children.length;
  cardCountText.textContent = `${n} cards`;
}

function validateDeckFields() {
  let ok = true;

  deckNameError.textContent = "";
  deckLanguageError.textContent = "";
  deckCategoryError.textContent = "";

  if (!deckName.value.trim() || deckName.value.trim().length < 2) {
    deckNameError.textContent = "Deck name is required (min 2 chars).";
    ok = false;
  }

  if (!deckLanguage.value) {
    deckLanguageError.textContent = "Language is required.";
    ok = false;
  }

  if (!deckCategory.value) {
    deckCategoryError.textContent = "Category is required.";
    ok = false;
  }

  return ok;
}

function validateCardRows() {
  let ok = true;
  const rows = Array.from(cardRows.children);

  for (const row of rows) {
    const term = row.querySelector(".term");
    const meaning = row.querySelector(".meaning");

    const termErr = row.querySelector(".term-error");
    const meaningErr = row.querySelector(".meaning-error");

    termErr.textContent = "";
    meaningErr.textContent = "";

    if (!term.value.trim()) {
      termErr.textContent = "Required.";
      ok = false;
    }

    if (!meaning.value.trim()) {
      meaningErr.textContent = "Required.";
      ok = false;
    }
  }

  if (rows.length === 0) {
    setToast("Add at least one card.");
    ok = false;
  }

  return ok;
}

function collectDeck() {
  const id = deckIdInput.value || uid("deck");

  const cards = Array.from(cardRows.children).map((row) => {
    const cardId = row.dataset.cardId || uid("card");
    const term = row.querySelector(".term").value.trim();
    const meaning = row.querySelector(".meaning").value.trim();
    const example = row.querySelector(".example").value.trim();

    return {
      id: cardId,
      term,
      meaning,
      example: example || ""
    };
  });

  return {
    id,
    name: deckName.value.trim(),
    language: deckLanguage.value,
    category: deckCategory.value,
    description: deckDescription.value.trim(),
    cards
  };
}

function addCard(card = { id: uid("card"), term: "", meaning: "", example: "" }) {
  cardRows.appendChild(cardRowTemplate(card));
  updateCount();
}

function loadIntoForm(d) {
  currentDeck = d;
  deckIdInput.value = d.id;
  deckName.value = d.name || "";
  deckLanguage.value = d.language || "";
  deckCategory.value = d.category || "";
  deckDescription.value = d.description || "";

  cardRows.innerHTML = "";
  for (const c of d.cards || []) addCard(c);

  studyDeckLink.href = `study.html?deck=${encodeURIComponent(d.id)}`;
  updateCount();
}

async function init() {
  const deckId = getParam("deck");

  if (deckId) {
    const found = await getDeckById(deckId);
    if (found) {
      loadIntoForm(found);
      setToast("Deck loaded.");
    } else {
      setToast("Deck not found. Creating a new deck.");
      addCard();
    }
  } else {
    addCard();
  }

  addCardBtn.addEventListener("click", () => addCard());

  addSampleBtn.addEventListener("click", () => {
    addCard({ id: uid("card"), term: "Hello", meaning: "안녕하세요", example: "" });
    addCard({ id: uid("card"), term: "Thank you", meaning: "감사합니다", example: "" });
    setToast("Sample cards added.");
  });

  deckForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const okDeck = validateDeckFields();
    const okCards = validateCardRows();
    if (!okDeck || !okCards) {
      setToast("Fix validation errors.");
      return;
    }

    const deck = collectDeck();
    upsertUserDeck(deck);

    studyDeckLink.href = `study.html?deck=${encodeURIComponent(deck.id)}`;
    setToast("Saved to local storage.");
  });

  deleteDeckBtn.addEventListener("click", async () => {
    const id = deckIdInput.value;
    if (!id) {
      setToast("Nothing to delete.");
      return;
    }

    if (typeof confirmDialog.showModal === "function") {
      confirmDialog.showModal();
      const res = await new Promise((resolve) => {
        confirmDialog.addEventListener(
          "close",
          () => resolve(confirmDialog.returnValue),
          { once: true }
        );
      });
      if (res !== "confirm") return;
    } else {
      const ok = window.confirm("Delete this deck?");
      if (!ok) return;
    }

    deleteUserDeck(id);
    setToast("Deleted.");
    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 400);
  });
}

init().catch((e) => {
  setToast(String(e.message || e));
});