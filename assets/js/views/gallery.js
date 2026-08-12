import { state } from "../state.js";
import { mediaFrame } from "../components.js";
import { escapeHTML, localize } from "../utils.js";

/** Render the adaptive image/video archive. */
export function renderGallery() {
  const { gallery } = state.content;
  const count = gallery.length;
  const layout = count <= 3 ? `gallery-count-${count}` : "gallery-count-many";
  return `
    <main class="page">
      <header class="page-head">
        <div>
          <p class="page-kicker">
            ${state.language === "ru" ? "Настоящие кадры и процесс" : "Real frames and process"}
          </p>
          <h1 class="page-title">${state.language === "ru" ? "Галерея" : "Gallery"}</h1>
        </div>
        <span class="page-count">${String(count).padStart(2, "0")} / FRAMES</span>
      </header>
      ${
        count
          ? `
            <section class="gallery-grid ${layout}" aria-label="Gallery">
              ${gallery
                .map((item, index) => {
                  const hasMedia = Boolean(item.imageUrl || item.mediaUrl);
                  return `
                    <article class="gallery-item">
                      ${
                        hasMedia
                          ? mediaFrame(
                              item,
                              "gallery-media",
                              localize(item.title),
                            )
                          : `
                            <div class="gallery-placeholder" aria-hidden="true">
                              <span>${String(index + 1).padStart(2, "0")}</span>
                            </div>
                          `
                      }
                      <div class="gallery-caption">
                        <span>/${String(index + 1).padStart(2, "0")}</span>
                        <span>${escapeHTML(localize(item.title))}</span>
                        <span>
                          ${hasMedia ? `${escapeHTML((item.mediaType || "image").toUpperCase())} · ` : ""}
                          ${escapeHTML(localize(item.caption))}
                        </span>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </section>
          `
          : `
            <div class="empty-state">
              ${state.language === "ru" ? "Галерея пока пуста" : "The gallery is empty"}
            </div>
          `
      }
    </main>
  `;
}
