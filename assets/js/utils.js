import { BASE_PATH, SITE_ROOT, STATUS_LABELS } from "./config.js";
import { state } from "./state.js";

/** Escape user-editable JSON values before placing them into HTML templates. */
export function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function localize(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[state.language] || value.en || value.ru || "";
}

export function routePath() {
  let path = decodeURI(window.location.pathname);
  if (BASE_PATH && path.startsWith(BASE_PATH)) {
    path = path.slice(BASE_PATH.length);
  }
  if (!path || path === "/index.html") return "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

export function routeHref(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}

export function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return new URL(path.replace(/^\/+/, ""), SITE_ROOT).href;
}

export function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

export function statusLabel(status) {
  return STATUS_LABELS[status]?.[state.language] || status;
}
