/**
 * Small, shared UI state.
 * Portfolio content itself is loaded from /content/*.json.
 */
export const state = {
  content: null,
  language: localStorage.getItem("kltzqu-language") === "ru" ? "ru" : "en",
  theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
  projectFilter: "All",
  menuOpen: false,
  transitioning: false,
};
