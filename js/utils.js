export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function uid(prefix = "id") {
  const rnd = Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now().toString(16)}-${rnd}`;
}

export function getParam(name, url = window.location.href) {
  const u = new URL(url);
  return u.searchParams.get(name);
}

export function setToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(setToast._t);
  setToast._t = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function normalize(s) {
  return String(s || "").trim().toLowerCase();
}