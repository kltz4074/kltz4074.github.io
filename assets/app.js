const app = document.querySelector("#app");
const siteRoot = new URL("../", import.meta.url);
const basePath = siteRoot.pathname.replace(/\/$/, "");

const state = {
  content: null,
  language: localStorage.getItem("kltzqu-language") === "ru" ? "ru" : "en",
  theme: document.documentElement.dataset.theme === "light" ? "light" : "dark",
  projectFilter: "All",
  menuOpen: false,
  transitioning: false,
};

const routes = [
  { path: "/", en: "Home", ru: "Главная" },
  { path: "/projects", en: "Projects", ru: "Проекты" },
  { path: "/lab", en: "Lab", ru: "Эксперименты" },
  { path: "/skills", en: "Skills", ru: "Навыки" },
  { path: "/gallery", en: "Gallery", ru: "Галерея" },
];

const statusLabels = {
  Released: { en: "Released", ru: "Выпущен" },
  "In development": { en: "In development", ru: "В разработке" },
  Paused: { en: "Paused", ru: "Приостановлен" },
  Prototype: { en: "Prototype", ru: "Прототип" },
};

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localize(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[state.language] || value.en || value.ru || "";
}

function routePath() {
  let path = decodeURI(window.location.pathname);
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }
  if (!path || path === "/index.html") return "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function routeHref(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalized}`;
}

function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return new URL(path.replace(/^\/+/, ""), siteRoot).href;
}

function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

async function getJSON(path) {
  const response = await fetch(new URL(path, siteRoot), { cache: "no-cache" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function loadContent() {
  const [site, projectIndex, skills, experiments, gallery] = await Promise.all([
    getJSON("content/site.json"),
    getJSON("content/projects/index.json"),
    getJSON("content/skills.json"),
    getJSON("content/experiments.json"),
    getJSON("content/gallery.json"),
  ]);
  const projects = await Promise.all(
    projectIndex.map((slug) => getJSON(`content/projects/${slug}.json`)),
  );
  return { ...site, projects, skills, experiments, gallery };
}

function cornerMarks() {
  return `
    <i class="corner tl"></i>
    <i class="corner tr"></i>
    <i class="corner bl"></i>
    <i class="corner br"></i>
  `;
}

function mediaFrame(item, className, label) {
  const src = mediaUrl(item.imageUrl || item.mediaUrl);
  if (!src) return "";
  if (item.mediaType === "video") {
    return `
      <video
        class="${className}"
        src="${escapeHTML(src)}"
        aria-label="${escapeHTML(label)}"
        autoplay loop muted playsinline preload="metadata"
      ></video>
    `;
  }
  return `
    <img
      class="${className}"
      src="${escapeHTML(src)}"
      alt="${escapeHTML(label)}"
      loading="lazy"
    >
  `;
}

function statusLabel(status) {
  return statusLabels[status]?.[state.language] || status;
}

function renderHome() {
  const { content } = state;
  const featured = content.projects.filter((project) => project.featured).slice(0, 3);
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

function renderProjects() {
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

function renderProject(slug) {
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
          <h1 class="detail-title">${escapeHTML(project.title)}</h1>
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
          <div class="visual-status">
            <span>${escapeHTML(project.stack)}</span>
            <span>${escapeHTML(project.year)}</span>
          </div>
        </div>
      </section>

      <section class="detail-grid">
        ${[
          [state.language === "ru" ? "Статус" : "Status", statusLabel(project.status)],
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

function renderSkills() {
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
                    .map((value) => `<i class="${value <= skill.level ? "on" : ""}"></i>`)
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

function renderExperiments() {
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

function renderGallery() {
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
                          ? mediaFrame(item, "gallery-media", localize(item.title))
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
    const project = state.content.projects.find((item) => path.endsWith(`/${item.slug}`));
    return project?.title || "Project";
  }
  return routes.find((route) => route.path === path)?.en || "KLTZQU";
}

function render() {
  const path = routePath();
  const destination = routeTitle(path);
  document.documentElement.lang = state.language;
  document.documentElement.dataset.theme = state.theme;
  document.title =
    path === "/" ? "KLTZQU — Game Developer" : `${destination} — KLTZQU`;

  app.className = "";
  app.innerHTML = `
    <div class="site-frame">
      <header class="site-header">
        <a href="${routeHref("/")}" data-route="/" class="wordmark">KLTZQU</a>
        <nav class="main-nav" aria-label="Primary navigation">
          ${routes
            .map(
              (route) => `
                <a
                  href="${routeHref(route.path)}"
                  data-route="${route.path}"
                  class="nav-link${activeRoute(path, route.path) ? " is-current" : ""}"
                >
                  ${route[state.language]}
                </a>
              `,
            )
            .join("")}
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
              ${routes
                .map(
                  (route) => `
                    <a href="${routeHref(route.path)}" data-route="${route.path}" class="nav-link">
                      ${route[state.language]}
                    </a>
                  `,
                )
                .join("")}
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

function navigate(path) {
  if (state.transitioning || routePath() === path) return;
  state.transitioning = true;
  const transition = document.querySelector("#page-transition");
  transition?.classList.add("is-active");
  const label = transition?.querySelector("span");
  if (label) {
    const route = routes.find((item) => item.path === path);
    label.textContent =
      route?.[state.language] || (state.language === "ru" ? "Проект" : "Project");
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
    const projects = state.content.projects.filter((project) => project.featured).slice(0, 3);
    signalField.addEventListener("pointermove", (event) => {
      const rect = signalField.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      signalField.style.setProperty("--x", `${x}%`);
      signalField.style.setProperty("--y", `${y}%`);
      signalField.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
      signalField.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      const coordinates = signalField.querySelector("#signal-coordinates");
      if (coordinates) {
        coordinates.textContent = `X ${Math.round(x).toString().padStart(2, "0")} · Y ${Math.round(y)
          .toString()
          .padStart(2, "0")}`;
      }
    });

    signalField.querySelectorAll("[data-signal]").forEach((row) => {
      row.addEventListener("pointerenter", () => {
        signalField
          .querySelectorAll("[data-signal]")
          .forEach((item) => item.classList.toggle("is-selected", item === row));
        const stack = signalField.querySelector("#signal-stack");
        if (stack) stack.textContent = projects[Number(row.dataset.signal)]?.stack || "";
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

window.addEventListener("popstate", () => {
  state.menuOpen = false;
  render();
});

try {
  state.content = await loadContent();
  render();
  const idle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 500));
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
