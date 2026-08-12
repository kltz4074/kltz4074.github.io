/**
 * Static route labels and project-status translations.
 * Keeping these values here makes navigation changes easy to find.
 */
export const SITE_ROOT = new URL("../../", import.meta.url);
export const BASE_PATH = SITE_ROOT.pathname.replace(/\/$/, "");

export const ROUTES = [
  { path: "/", en: "Home", ru: "Главная" },
  { path: "/projects", en: "Projects", ru: "Проекты" },
  { path: "/lab", en: "Lab", ru: "Эксперименты" },
  { path: "/skills", en: "Skills", ru: "Навыки" },
  { path: "/gallery", en: "Gallery", ru: "Галерея" },
];

export const STATUS_LABELS = {
  Released: { en: "Released", ru: "Выпущен" },
  "In development": { en: "In development", ru: "В разработке" },
  Paused: { en: "Paused", ru: "Приостановлен" },
  Prototype: { en: "Prototype", ru: "Прототип" },
};
