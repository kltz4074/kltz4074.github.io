import { state } from "../state.js";
import { escapeHTML, localize, routeHref, statusLabel } from "../utils.js";

/** Render the filterable project archive. */
export function renderProjects() {
  const { projects } = state.content;
  const visible =
    state.projectFilter === "All"
      ? projects
      : projects.filter((project) => project.status === state.projectFilter);
  const filters = ["All", "Released", "In development", "Prototype", "Paused"];

  return `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="page-kicker">
            ${state.language === "ru" ? "Игры и технические работы" : "Games and technical work"}
          </p>
          <h1 class="page-title">${state.language === "ru" ? "Проекты" : "Projects"}</h1>
        </div>
        <span class="page-count">
          ${String(visible.length).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}
        </span>
      </header>
      <nav class="filter-bar" aria-label="Project filters">
        ${filters
          .map(
            (filter) => `
              <button
                class="filter-button${filter === state.projectFilter ? " is-active" : ""}"
                type="button"
                data-filter="${escapeHTML(filter)}"
              >
                ${
                  filter === "All"
                    ? state.language === "ru"
                      ? "Все"
                      : "All"
                    : escapeHTML(statusLabel(filter))
                }
              </button>
            `,
          )
          .join("")}
      </nav>
      <section class="project-list">
        ${visible
          .map(
            (project, index) => `
              <a
                href="${routeHref(`/projects/${project.slug}`)}"
                data-route="/projects/${escapeHTML(project.slug)}"
                class="project-card"
              >
                <span class="project-index">/${String(index + 1).padStart(2, "0")}</span>
                <h2 class="project-name">${escapeHTML(project.title)}</h2>
                <p class="project-description">${escapeHTML(localize(project.description))}</p>
                <span class="project-status">${escapeHTML(statusLabel(project.status))}</span>
                <span class="project-arrow">→</span>
              </a>
            `,
          )
          .join("")}
      </section>
    </main>
  `;
}
