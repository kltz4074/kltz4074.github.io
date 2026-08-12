import { state } from "../state.js";
import { mediaFrame } from "../components.js";
import {
  escapeHTML,
  localize,
  mediaUrl,
  routeHref,
  safeExternalUrl,
  statusLabel,
} from "../utils.js";

/** Render one project case study and its related gallery media. */
export function renderProject(slug) {
  const { projects, gallery } = state.content;
  const project = projects.find((item) => item.slug === slug);
  const index = projects.findIndex((item) => item.slug === slug);
  if (!project) {
    return `
      <main class="page empty-state">
        <div>
          <p>${state.language === "ru" ? "Проект не найден" : "Project not found"}</p>
          <a href="${routeHref("/projects")}" data-route="/projects" class="outline-action">
            ${state.language === "ru" ? "Назад к проектам" : "Back to projects"}
          </a>
        </div>
      </main>
    `;
  }

  const relatedMedia = gallery.filter(
    (item) => item.projectSlug === slug && (item.imageUrl || item.mediaUrl),
  );
  const cover = mediaUrl(project.coverUrl);
  const projectUrl = safeExternalUrl(project.projectUrl);
  const githubUrl = safeExternalUrl(project.githubUrl);

  return `
    <main class="page">
      <section class="detail-hero">
        <div class="detail-copy">
          <p class="page-kicker">
            /${String(index + 1).padStart(2, "0")} · ${escapeHTML(statusLabel(project.status))}
          </p>
          <p class="detail-summary">${escapeHTML(localize(project.description))}</p>
          ${
            projectUrl || githubUrl
              ? `
                <div class="detail-actions">
                  ${
                    projectUrl
                      ? `
                        <a class="outline-action" href="${escapeHTML(projectUrl)}" target="_blank" rel="noreferrer">
                          <span>${state.language === "ru" ? "Открыть проект" : "Open project"}</span>
                          <span class="arrow">↗</span>
                        </a>
                      `
                      : ""
                  }
                  ${
                    githubUrl
                      ? `
                        <a class="outline-action" href="${escapeHTML(githubUrl)}" target="_blank" rel="noreferrer">
                          <span>GitHub</span><span class="arrow">↗</span>
                        </a>
                      `
                      : ""
                  }
                </div>
              `
              : ""
          }
        </div>
        <div
          class="project-visual${cover ? " has-image" : ""}"
          ${cover ? `style="background-image:url('${escapeHTML(cover)}')"` : ""}
        >
          ${cover ? "" : `<span class="visual-number">${String(index + 1).padStart(2, "0")}</span>`}
          <h1 class="detail-title project-visual-title">${escapeHTML(project.title)}</h1>
          <div class="visual-status">
            <span>${escapeHTML(project.stack)}</span>
            <span>${escapeHTML(project.year)}</span>
          </div>
        </div>
      </section>

      <section class="detail-grid">
        ${[
          [
            state.language === "ru" ? "Статус" : "Status",
            statusLabel(project.status),
          ],
          [state.language === "ru" ? "Роль" : "Role", project.role],
          [state.language === "ru" ? "Команда" : "Team", project.team],
          [state.language === "ru" ? "Движок" : "Engine", project.engine],
          [state.language === "ru" ? "Дата" : "Date", project.date],
          [state.language === "ru" ? "Релиз" : "Release", project.downloads],
        ]
          .map(
            ([label, value]) => `
              <div class="detail-cell">
                <small>${escapeHTML(label)}</small>
                <span>${escapeHTML(value)}</span>
              </div>
            `,
          )
          .join("")}
      </section>

      <section class="project-case-study">
        <article class="case-study-intro">
          <p class="page-kicker">01 / ${state.language === "ru" ? "О проекте" : "Project brief"}</p>
          <p>${escapeHTML(localize(project.longDescription))}</p>
          <div class="case-study-stack">
            <span>${state.language === "ru" ? "Технологии" : "Technology"}</span>
            <strong>${escapeHTML(project.stack)}</strong>
          </div>
        </article>
        <div class="case-study-notes">
          <article>
            <span class="case-study-number">02</span>
            <small>${state.language === "ru" ? "Самое сложное" : "The challenge"}</small>
            <p>${escapeHTML(localize(project.challenge))}</p>
          </article>
          <article>
            <span class="case-study-number">03</span>
            <small>${state.language === "ru" ? "Чему я научился" : "What I learned"}</small>
            <p>${escapeHTML(localize(project.learnings))}</p>
          </article>
        </div>
      </section>

      ${
        relatedMedia.length
          ? `
            <section class="project-media-section">
              <div class="section-label">
                <span>04 / ${state.language === "ru" ? "Материалы" : "Media archive"}</span>
                <span>${String(relatedMedia.length).padStart(2, "0")} FILES</span>
              </div>
              <div class="project-media-grid">
                ${relatedMedia
                  .map(
                    (item, mediaIndex) => `
                      <article class="project-media-item">
                        ${mediaFrame(item, "project-media", localize(item.title))}
                        <div class="project-media-caption">
                          <span>/${String(mediaIndex + 1).padStart(2, "0")}</span>
                          <span>${escapeHTML(localize(item.title))}</span>
                          <span>${escapeHTML((item.mediaType || "image").toUpperCase())}</span>
                        </div>
                      </article>
                    `,
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }
    </main>
  `;
}
