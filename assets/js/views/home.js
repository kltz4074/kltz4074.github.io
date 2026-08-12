import { state } from "../state.js";
import { cornerMarks } from "../components.js";
import { escapeHTML, localize, routeHref, statusLabel } from "../utils.js";

/** Render the landing page and its interactive project signal. */
export function renderHome() {
  const { content } = state;
  const featured = content.projects
    .filter((project) => project.featured)
    .slice(0, 3);
  return `
    <main class="page">
      <section class="hero">
        <div class="hero-copy">
          ${cornerMarks()}
          <p class="eyebrow">${escapeHTML(localize(content.hero.eyebrow))}</p>
          <h1 class="display-title">${escapeHTML(localize(content.hero.title))}</h1>
          <p class="hero-subtitle">${escapeHTML(localize(content.hero.subtitle))}</p>
          <div class="hero-actions">
            <a href="${routeHref("/projects")}" data-route="/projects" class="outline-action">
              <span>${state.language === "ru" ? "Смотреть проекты" : "View projects"}</span>
              <span class="arrow">→</span>
            </a>
            <div class="current-state">
              <span>
                <i></i>
                ${state.language === "ru" ? "Сейчас" : "Currently"}
              </span>
              ${escapeHTML(localize(content.hero.current))}
            </div>
          </div>
        </div>

        <div class="signal-field" id="signal-field">
          ${cornerMarks()}
          <div class="signal-axis-x"></div>
          <div class="signal-axis-y"></div>
          <div class="signal-meta">
            <span>PROJECT SIGNAL / 2026</span>
            <span id="signal-coordinates">X 50 · Y 50</span>
          </div>
          <div class="signal-index">
            ${featured
              .map(
                (project, index) => `
                  <a
                    href="${routeHref(`/projects/${project.slug}`)}"
                    data-route="/projects/${escapeHTML(project.slug)}"
                    data-signal="${index}"
                    class="signal-row${index === 0 ? " is-selected" : ""}"
                  >
                    <span class="signal-no">/${String(index + 1).padStart(2, "0")}</span>
                    <span class="signal-name">${escapeHTML(project.title)}</span>
                    <span class="signal-status">${escapeHTML(statusLabel(project.status))}</span>
                  </a>
                `,
              )
              .join("")}
          </div>
          <div class="signal-caption">
            <span>${state.language === "ru" ? "Выбери сигнал" : "Select a signal"}</span>
            <span id="signal-stack">${escapeHTML(featured[0]?.stack || "")}</span>
          </div>
        </div>
      </section>

      <section class="home-strip" aria-label="Portfolio facts">
        <div class="strip-cell">${escapeHTML(localize(content.hero.current))}</div>
        <div class="strip-cell">
          <strong>${content.projects.length}</strong>
          ${state.language === "ru" ? "Проектов в архиве" : "Projects in archive"}
        </div>
        <div class="strip-cell">
          <strong>${escapeHTML(content.downloads || "20K+")}</strong>
          ${state.language === "ru" ? "Скачиваний игр" : "Game downloads"}
        </div>
      </section>
    </main>
  `;
}
