const ANALYTICS_NAMESPACE = "kltz4074.github.io";
const ANALYTICS_ACTION = "pageview";

function analyticsKey(pathname = window.location.pathname) {
  const normalized = pathname
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "--");
  return normalized || "home";
}

function analyticsUrl(key) {
  return `https://counterapi.com/api/${encodeURIComponent(ANALYTICS_NAMESPACE)}/${encodeURIComponent(ANALYTICS_ACTION)}/${encodeURIComponent(key)}?trackOnly=true`;
}

let lastTrackedPath = "";

export function trackCurrentPage() {
  const path = window.location.pathname || "/";
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;

  fetch(analyticsUrl(analyticsKey(path)), {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    keepalive: true,
    credentials: "omit",
    referrerPolicy: "no-referrer",
  }).catch(() => {
    // Analytics must never affect the portfolio experience.
  });
}

const originalPushState = window.history.pushState.bind(window.history);
window.history.pushState = (...args) => {
  const result = originalPushState(...args);
  queueMicrotask(trackCurrentPage);
  return result;
};

window.addEventListener("popstate", () => queueMicrotask(trackCurrentPage));
queueMicrotask(trackCurrentPage);
