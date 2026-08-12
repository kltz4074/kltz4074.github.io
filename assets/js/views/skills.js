import { state } from "../state.js";
import { escapeHTML, localize } from "../utils.js";

/** Render the capabilities grid. */
export function renderSkills() {
  const { skills } = state.content;
  return `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="page-kicker">
            ${state.language === "ru" ? "Что я использую для создания игр" : "What I use to make games"}
          </p>
          <h1 class="page-title">${state.language === "ru" ? "Навыки" : "Skills"}</h1>
        </div>
        <span class="page-count">${String(skills.length).padStart(2, "0")} / CORE</span>
      </header>
      <section class="skill-grid">
        ${skills
          .map(
            (skill, index) => `
              <article class="skill-card">
                <div class="skill-topline">
                  <span>/${String(index + 1).padStart(2, "0")}</span>
                  <span>${String(skill.level).padStart(2, "0")} / 05</span>
                </div>
                <h2 class="skill-name">${escapeHTML(skill.name)}</h2>
                <p class="skill-note">${escapeHTML(localize(skill.note))}</p>
                <div class="skill-meter" aria-label="${skill.level} out of 5">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (value) =>
                        `<i class="${value <= skill.level ? "on" : ""}"></i>`,
                    )
                    .join("")}
                </div>
              </article>
            `,
          )
          .join("")}
      </section>
    </main>
  `;
}
