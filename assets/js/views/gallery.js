import { state } from "../state.js";
import { mediaFrame } from "../components.js";
import { escapeHTML, localize } from "../utils.js";

/** Render the adaptive image/video archive. */
export function renderGallery() {
  const items = state.content.gallery.filter(
    (item) => item.imageUrl || item.mediaUrl,
  );
  const count = items.length;
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
              ${items
                .map((item, index) => {
                  const title = String(localize(item.title) || "").trim();
                  const caption = String(localize(item.caption) || "").trim();
                  const showCaption = Boolean(caption);

                  return `
                    <article class="gallery-item">
                      ${mediaFrame(item, "gallery-media", title)}
                      ${
                        showCaption
                          ? `
                            <div class="gallery-caption">
                              <span>/${String(index + 1).padStart(2, "0")}</span>
                              <span>${escapeHTML(title)}</span>
                              <span>
                                ${escapeHTML((item.mediaType || "image").toUpperCase())} · ${escapeHTML(caption)}
                              </span>
                            </div>
                          `
                          : ""
                      }
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
