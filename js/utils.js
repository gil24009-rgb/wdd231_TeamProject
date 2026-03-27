export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function uid(prefix = "id") {
  const random = Math.random().toString(16).slice(2);
  return `${prefix}-${Date.now().toString(16)}-${random}`;
}

export function getParam(name, url = window.location.href) {
  const currentUrl = new URL(url);
  return currentUrl.searchParams.get(name);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function setToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(setToast._timeoutId);
  setToast._timeoutId = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}