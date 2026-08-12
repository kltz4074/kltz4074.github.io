import { ROUTES } from "./config.js";
import { loadContent } from "./content.js";
import { state } from "./state.js";
import {
  escapeHTML,
  mediaUrl,
  routeHref,
  routePath,
  safeExternalUrl,
} from "./utils.js";
import { renderGallery } from "./views/gallery.js";
import { renderHome } from "./views/home.js";
import { renderExperiments } from "./views/lab.js";
import { renderProject } from "./views/project.js";
import { renderProjects } from "./views/projects.js";
import { renderSkills } from "./views/skills.js";

const app = document.querySelector("#app");

/* -------------------------------------------------------------------------- */
/* Routing and document rendering                                              */
/* -------------------------------------------------------------------------- */

function currentPage() {
  const path = routePath();
  if (path === "/") return renderHome();
  if (path === "/projects") return renderProjects();
  if (path.startsWith("/projects/")) {
    return renderProject(path.split("/").filter(Boolean)[1]);
  }
  if (path === "/lab") return renderExperiments();
  if (path === "/skills") return renderSkills();
  if (path === "/gallery") return renderGallery();
  return `
    <main class="page empty-state">
      <div>
        <p>404 / ${state.language === "ru" ? "Страница не найдена" : "Page not found"}</p>
        <a href="${routeHref("/")}" data-route="/" class="outline-action">
          ${state.language === "ru" ? "Вернуться на главную" : "Return home"}
        </a>
      </div>
    </main>
  `;
}

function activeRoute(path, route) {
  return route === "/" ? path === "/" : path.startsWith(route);
}

function routeTitle(path) {
  if (path.startsWith("/projects/")) {
    const project = state.content.projects.find((item) =>
      path.endsWith(`/${item.slug}`),
    );
    return project?.title || "Project";
  }
  return ROUTES.find((route) => route.path === path)?.en || "KLTZQU";
}

function render() {
  const path = routePath();
  const destination = routeTitle(path);
  document.documentElement.lang = state.language;
  document.documentElement.dataset.theme = state.theme;
  document.title =
    path === "/" ? "KLTZQU -- Partfolio Website" : `${destination} — KLTZQU`;

  app.className = "";
  app.innerHTML = `
    <div class="site-frame">
      <header class="site-header">
        <a href="${routeHref("/")}" data-route="/" class="wordmark">KLTZQU</a>
        <nav class="main-nav" aria-label="Primary navigation">
          ${ROUTES.map(
            (route) => `
                <a
                  href="${routeHref(route.path)}"
                  data-route="${route.path}"
                  class="nav-link${activeRoute(path, route.path) ? " is-current" : ""}"
                >
                  ${route[state.language]}
                </a>
              `,
          ).join("")}
        </nav>
        <div class="header-controls">
          <button class="control-button" type="button" id="language-toggle">
            ${state.language.toUpperCase()}
          </button>
          <button class="control-button" type="button" id="theme-toggle" aria-label="Toggle theme">
            ${state.theme === "dark" ? "◐" : "◑"}
          </button>
          <button
            class="control-button mobile-menu"
            type="button"
            id="menu-toggle"
            aria-expanded="${state.menuOpen}"
            aria-label="Toggle navigation"
          >
            ${state.menuOpen ? "×" : "≡"}
          </button>
        </div>
      </header>

      ${
        state.menuOpen
          ? `
            <nav class="mobile-nav" aria-label="Mobile navigation">
              ${ROUTES.map(
                (route) => `
                    <a href="${routeHref(route.path)}" data-route="${route.path}" class="nav-link">
                      ${route[state.language]}
                    </a>
                  `,
              ).join("")}
            </nav>
          `
          : ""
      }

      ${currentPage()}

      <footer class="site-footer">
        <div class="footer-copy">
          © ${new Date().getFullYear()} KLTZQU — ${
            state.language === "ru" ? "Сделано вручную" : "Built by hand"
          }
        </div>
        <div class="footer-links">
          ${
            safeExternalUrl(state.content.links.github)
              ? `<a href="${escapeHTML(safeExternalUrl(state.content.links.github))}" target="_blank" rel="noreferrer">GitHub ↗</a>`
              : ""
          }
          ${
            safeExternalUrl(state.content.links.itch)
              ? `<a href="${escapeHTML(safeExternalUrl(state.content.links.itch))}" target="_blank" rel="noreferrer">itch.io ↗</a>`
              : ""
          }
        </div>
      </footer>

      <div class="page-transition${state.transitioning ? " is-active" : ""}" id="page-transition" aria-hidden="true">
        <span>${escapeHTML(destination)}</span>
      </div>
    </div>
  `;

  bindInteractions();
}

/* Page transitions and History API navigation. */
function navigate(path) {
  if (state.transitioning || routePath() === path) return;
  state.transitioning = true;
  const transition = document.querySelector("#page-transition");
  transition?.classList.add("is-active");
  const label = transition?.querySelector("span");
  if (label) {
    const route = ROUTES.find((item) => item.path === path);
    label.textContent =
      route?.[state.language] ||
      (state.language === "ru" ? "Проект" : "Project");
  }

  window.setTimeout(() => {
    window.history.pushState({}, "", routeHref(path));
    state.menuOpen = false;
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    window.setTimeout(() => {
      state.transitioning = false;
      document.querySelector("#page-transition")?.classList.remove("is-active");
    }, 240);
  }, 300);
}

/* Rebind interactions after each HTML render. */
function bindInteractions() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      navigate(link.dataset.route);
    });
  });

  document.querySelector("#language-toggle")?.addEventListener("click", () => {
    state.language = state.language === "en" ? "ru" : "en";
    localStorage.setItem("kltzqu-language", state.language);
    render();
  });

  document.querySelector("#theme-toggle")?.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("kltzqu-theme", state.theme);
    render();
  });

  document.querySelector("#menu-toggle")?.addEventListener("click", () => {
    state.menuOpen = !state.menuOpen;
    render();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.projectFilter = button.dataset.filter;
      render();
    });
  });

  const signalField = document.querySelector("#signal-field");
  if (signalField) {
    const projects = state.content.projects
      .filter((project) => project.featured)
      .slice(0, 3);
    signalField.addEventListener("pointermove", (event) => {
      const rect = signalField.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      signalField.style.setProperty("--x", `${x}%`);
      signalField.style.setProperty("--y", `${y}%`);
      signalField.style.setProperty(
        "--pointer-x",
        `${event.clientX - rect.left}px`,
      );
      signalField.style.setProperty(
        "--pointer-y",
        `${event.clientY - rect.top}px`,
      );
      const coordinates = signalField.querySelector("#signal-coordinates");
      if (coordinates) {
        coordinates.textContent = `X ${Math.round(x).toString().padStart(2, "0")} · Y ${Math.round(
          y,
        )
          .toString()
          .padStart(2, "0")}`;
      }
    });

    signalField.querySelectorAll("[data-signal]").forEach((row) => {
      row.addEventListener("pointerenter", () => {
        signalField
          .querySelectorAll("[data-signal]")
          .forEach((item) =>
            item.classList.toggle("is-selected", item === row),
          );
        const stack = signalField.querySelector("#signal-stack");
        if (stack)
          stack.textContent = projects[Number(row.dataset.signal)]?.stack || "";
      });
    });
  }

  document.querySelectorAll("img, video").forEach((media) => {
    media.addEventListener("error", () => {
      media.replaceWith(
        Object.assign(document.createElement("div"), {
          className: "media-fallback",
          textContent:
            state.language === "ru"
              ? "Медиа-файл не найден"
              : "Media file not found",
        }),
      );
    });
  });
}

/* Low-priority media prefetching keeps the first render fast. */
function preloadMedia() {
  const files = [
    ...state.content.projects.map((item) => item.coverUrl),
    ...state.content.gallery.map((item) => item.imageUrl || item.mediaUrl),
    ...state.content.experiments.map((item) => item.mediaUrl),
  ].filter(Boolean);

  files.forEach((file) => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = mediaUrl(file);
    document.head.append(link);
  });
}

/* Browser back/forward navigation. */
window.addEventListener("popstate", () => {
  state.menuOpen = false;
  render();
});

/* Application entry point. */
try {
  state.content = await loadContent();
  render();
  const idle =
    window.requestIdleCallback ||
    ((callback) => window.setTimeout(callback, 500));
  idle(preloadMedia);
} catch (error) {
  console.error(error);
  app.className = "static-status";
  app.innerHTML = `
    <div>
      <strong>Archive offline</strong>
      ${
        state.language === "ru"
          ? "Не удалось загрузить JSON-файлы. Проверь структуру папки content."
          : "Could not load the JSON files. Check the content folder structure."
      }
    </div>
  `;
}
