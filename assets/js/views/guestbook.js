import { state } from "../state.js";
import { escapeHTML } from "../utils.js";

const ISSUE_API =
  "https://api.github.com/repos/kltz4074/kltz4074.github.io/issues/1/comments?per_page=100";
const ISSUE_URL =
  "https://github.com/kltz4074/kltz4074.github.io/issues/1#new_comment_field";

function t(en, ru) {
  return state.language === "ru" ? ru : en;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(state.language === "ru" ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function renderMessage(comment, index) {
  const author = comment.user?.login || "github-user";
  const avatar = comment.user?.avatar_url || "";
  const body = escapeHTML(comment.body || "").replace(/\n/g, "<br>");
  const authorUrl = `https://github.com/${encodeURIComponent(author)}`;

  return `
    <article class="guestbook-entry">
      <div class="guestbook-index">${String(index + 1).padStart(2, "0")}</div>
      <div class="guestbook-entry-main">
        <header class="guestbook-entry-header">
          <a class="guestbook-author" href="${authorUrl}" target="_blank" rel="noreferrer">
            ${
              avatar
                ? `<img src="${escapeHTML(avatar)}" alt="" loading="lazy">`
                : ""
            }
            <strong>@${escapeHTML(author)}</strong>
          </a>
          <time datetime="${escapeHTML(comment.created_at || "")}">${formatDate(comment.created_at)}</time>
        </header>
        <div class="guestbook-message">${body || "—"}</div>
        <a class="guestbook-source" href="${escapeHTML(comment.html_url || ISSUE_URL)}" target="_blank" rel="noreferrer">
          ${t("VIEW ON GITHUB ↗", "ОТКРЫТЬ НА GITHUB ↗")}
        </a>
      </div>
    </article>
  `;
}

export function renderGuestbook() {
  return `
    <main class="page guestbook-page">
      <section class="guestbook-hero">
        <div class="guestbook-kicker">GUEST BOOK / 2026</div>
        <div class="guestbook-title-row">
          <h1>${t("Guest Book", "Гостевая")}</h1>
          <span class="guestbook-count" data-guestbook-count>— ${t("messages", "сообщений")}</span>
        </div>
        <div class="guestbook-intro-row">
          <p>
            ${t(
              "Leave a note, feedback, a hello, or just mark that you were here. Messages are stored as comments in a public GitHub issue.",
              "Оставь заметку, отзыв, привет или просто отметься, что ты здесь был. Сообщения хранятся как комментарии в публичном GitHub Issue.",
            )}
          </p>
          <div class="guestbook-actions">
            <a class="solid-action" href="${ISSUE_URL}" target="_blank" rel="noreferrer">
              ${t("LEAVE A MESSAGE ↗", "ОСТАВИТЬ СООБЩЕНИЕ ↗")}
            </a>
            <button class="outline-action guestbook-refresh" type="button" data-guestbook-refresh>
              ${t("REFRESH", "ОБНОВИТЬ")}
            </button>
          </div>
        </div>
      </section>

      <section class="guestbook-list" data-guestbook-list>
        <div class="guestbook-loading">${t("Loading guest book…", "Загружаю гостевую книгу…")}</div>
      </section>

      <section class="guestbook-note">
        <span>HOW IT WORKS</span>
        <p>
          ${t(
            "GitHub Pages cannot save messages by itself, so this page uses comments from one GitHub Issue as the database. A GitHub account is required to post; reading is public.",
            "GitHub Pages сам не умеет сохранять сообщения, поэтому эта страница использует комментарии одного GitHub Issue как базу данных. Для отправки нужен GitHub-аккаунт, чтение публичное.",
          )}
        </p>
      </section>
    </main>
  `;
}

export async function hydrateGuestbook() {
  const list = document.querySelector("[data-guestbook-list]");
  const count = document.querySelector("[data-guestbook-count]");
  const refreshButton = document.querySelector("[data-guestbook-refresh]");
  if (!list || !count) return;

  async function load() {
    refreshButton?.setAttribute("disabled", "");
    if (refreshButton) refreshButton.textContent = t("REFRESHING…", "ОБНОВЛЯЮ…");
    try {
      const response = await fetch(`${ISSUE_API}&t=${Date.now()}`, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`GitHub API ${response.status}`);
      const comments = await response.json();
      count.textContent = `${comments.length} ${t("messages", "сообщений")}`;
      list.innerHTML = comments.length
        ? comments.map(renderMessage).join("")
        : `<div class="guestbook-empty">
            <strong>${t("No messages yet.", "Пока сообщений нет.")}</strong>
            <span>${t("You can be the first one.", "Можешь оставить первое.")}</span>
          </div>`;
    } catch (error) {
      console.error("Could not load guest book", error);
      list.innerHTML = `<div class="guestbook-empty is-error">
        <strong>${t("Could not load messages.", "Не удалось загрузить сообщения.")}</strong>
        <span>${t("Try refreshing in a moment.", "Попробуй обновить через несколько секунд.")}</span>
      </div>`;
    } finally {
      refreshButton?.removeAttribute("disabled");
      if (refreshButton) refreshButton.textContent = t("REFRESH", "ОБНОВИТЬ");
    }
  }

  refreshButton?.addEventListener("click", load);
  await load();
}
