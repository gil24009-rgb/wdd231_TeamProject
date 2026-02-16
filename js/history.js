import { getAllDecks } from "./app.js";
import { qs, normalize, setToast } from "./utils.js";
import {
  exportAllData,
  importAllData,
  loadHistory,
  pushHistory,
  clearHistory
} from "./storage.js";

const deckFilter = qs("#deckFilter");
const typeFilter = qs("#typeFilter");
const searchFilter = qs("#searchFilter");
const historyList = qs("#historyList");
const historySummary = qs("#historySummary");
const clearHistoryBtn = qs("#clearHistoryBtn");
const exportBtn = qs("#exportBtn");
const importFile = qs("#importFile");

let decksById = {};
let history = [];

function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[c] || c;
  });
}

function render() {
  const deckId = deckFilter.value;
  const type = typeFilter.value;
  const q = normalize(searchFilter.value);

  const filtered = history.filter((h) => {
    const okDeck = deckId === "all" || h.deckId === deckId;
    const okType = type === "all" || h.type === type;
    const deckName = decksById[h.deckId]?.name || h.deckId || "";
    const text = normalize(`${deckName} ${h.message || ""} ${h.action || ""}`);
    const okQ = !q || text.includes(q);
    return okDeck && okType && okQ;
  });

  historySummary.textContent = `${filtered.length} items shown. ${history.length} total.`;

  historyList.innerHTML = "";
  if (filtered.length === 0) {
    historyList.innerHTML = `<div class="history-item">No history matches your filters.</div>`;
    return;
  }

  for (const h of filtered) {
    const deckName = decksById[h.deckId]?.name || "Unknown deck";
    const title = h.deckId ? `${deckName}` : "System";
    const msg = h.message || "";
    const action = h.action ? ` · ${h.action}` : "";
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-top">
        <div class="history-title">
          <span class="tag">${escapeHtml(h.type)}</span>
          <span>${escapeHtml(title)}${escapeHtml(action)}</span>
        </div>
        <div class="history-time">${escapeHtml(fmtTime(h.at))}</div>
      </div>
      <div class="history-msg">${escapeHtml(msg)}</div>
    `;
    historyList.appendChild(item);
  }
}

async function init() {
  const decks = await getAllDecks();
  decksById = Object.fromEntries(decks.map((d) => [d.id, d]));

  for (const d of decks) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    deckFilter.appendChild(opt);
  }

  history = loadHistory();

  deckFilter.addEventListener("change", render);
  typeFilter.addEventListener("change", render);
  searchFilter.addEventListener("input", render);

  clearHistoryBtn.addEventListener("click", () => {
    clearHistory();
    history = loadHistory();
    setToast("History cleared.");
    render();
  });

  exportBtn.addEventListener("click", async () => {
    const blob = exportAllData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexibridge-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    pushHistory({
      type: "export",
      deckId: "",
      action: "export",
      message: "Exported local data backup."
    });

    history = loadHistory();
    setToast("Exported.");
    render();
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = importAllData(data);

      pushHistory({
        type: "import",
        deckId: "",
        action: "import",
        message: `Imported. Decks ${result.decks}. Progress ${result.progress}. History ${result.history}.`
      });

      history = loadHistory();
      setToast("Imported.");
      window.setTimeout(() => window.location.reload(), 350);
    } catch (e) {
      setToast(`Import failed: ${String(e.message || e)}`);
    } finally {
      importFile.value = "";
    }
  });

  render();
}

init().catch((e) => {
  historySummary.textContent = `Error: ${String(e.message || e)}`;
});