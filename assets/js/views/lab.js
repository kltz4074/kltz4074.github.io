import { state } from "../state.js";
import { mediaFrame } from "../components.js";
import { escapeHTML, localize, safeExternalUrl } from "../utils.js";

/** Render experiments from content/experiments.json. */
export function renderExperiments() {
  const { experiments } = state.content;
  return `
    <main class="page">
      <header class="page-head lab-head">
        <div>
          <p class="page-kicker">
            ${
              state.language === "ru"
                ? "Механики, рендеринг и незаконченные идеи"
                : "Mechanics, rendering and unfinished ideas"
            }
          </p>
          <h1 class="page-title">LAB</h1>
        </div>
        <span class="page-count">${String(experiments.length).padStart(2, "0")} / TESTS</span>
      </header>
      <section class="lab-grid">
        ${experiments
          .map((experiment, index) => {
            const hasMedia = Boolean(experiment.mediaUrl);
            const projectUrl = safeExternalUrl(experiment.projectUrl);
            return `
              <article class="lab-card">
                <div class="lab-visual">
                  ${
                    hasMedia
                      ? mediaFrame(experiment, "lab-media", experiment.title)
                      : `
                        <div class="lab-schematic" aria-hidden="true">
                          <span class="lab-schematic-index">${String(index + 1).padStart(2, "0")}</span>
                          <i></i>
                          <b>${escapeHTML(experiment.category)}</b>
                        </div>
                      `
                  }
                  <span class="lab-type">
                    ${hasMedia ? escapeHTML(experiment.mediaType.toUpperCase()) : "LIVE SCHEMATIC"}
                  </span>
                </div>
                <div class="lab-copy">
                  <div class="lab-meta">
                    <span>/${String(index + 1).padStart(2, "0")}</span>
                    <span>${escapeHTML(experiment.category)}</span>
                    <span>${escapeHTML(experiment.year)}</span>
                  </div>
                  <h2>${escapeHTML(experiment.title)}</h2>
                  <p>${escapeHTML(localize(experiment.description))}</p>
                  <div class="lab-stack">${escapeHTML(experiment.stack)}</div>
                  ${
                    projectUrl
                      ? `
                        <a href="${escapeHTML(projectUrl)}" target="_blank" rel="noreferrer" class="lab-link">
                          ${state.language === "ru" ? "Открыть эксперимент" : "Open experiment"} ↗
                        </a>
                      `
                      : ""
                  }
                </div>
              </article>
            `;
          })
          .join("")}
      </section>
    </main>
  `;
}
