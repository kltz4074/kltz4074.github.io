const ANALYTICS_JSON_URL = "/content/analytics.json";

function addAnalyticsStylesheet() {
  if (document.querySelector('link[data-analytics-styles]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/admin/analytics.css";
  link.dataset.analyticsStyles = "true";
  document.head.append(link);
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Ещё нет данных";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ещё нет данных";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function installAnalyticsSection() {
  addAnalyticsStylesheet();

  const nav = document.querySelector(".admin-nav");
  const securityButton = nav?.querySelector('[data-section="security"]');
  const securityPanel = document.querySelector('[data-panel="security"]');
  if (!nav || !securityButton || !securityPanel) return;

  securityButton.querySelector("span").textContent = "07";
  const securityEyebrow = securityPanel.querySelector(".section-header span");
  if (securityEyebrow) securityEyebrow.textContent = "07 / LOCAL VAULT";

  const button = document.createElement("button");
  button.className = "admin-nav-button";
  button.dataset.section = "analytics";
  button.type = "button";
  button.innerHTML = "<span>06</span>Статистика";
  nav.insertBefore(button, securityButton);

  const panel = document.createElement("section");
  panel.className = "admin-section";
  panel.dataset.panel = "analytics";
  panel.innerHTML = `
    <header class="section-header">
      <div>
        <span>06 / ANALYTICS</span>
        <h1>Статистика</h1>
      </div>
      <div class="header-button-group">
        <button class="secondary-button" type="button" data-analytics-refresh>↻ ОБНОВИТЬ</button>
        <div class="analytics-range" aria-label="Период статистики">
          <button type="button" data-analytics-days="7">7 ДНЕЙ</button>
          <button type="button" class="is-active" data-analytics-days="30">30 ДНЕЙ</button>
        </div>
      </div>
    </header>

    <section class="analytics-cards">
      <article class="analytics-card">
        <div class="analytics-card-label">Уникальных посетителей / всего</div>
        <div class="analytics-card-value" data-analytics-total-visitors>—</div>
        <div class="analytics-card-sub">с момента запуска счётчика</div>
      </article>
      <article class="analytics-card">
        <div class="analytics-card-label">Уникальных / за период</div>
        <div class="analytics-card-value" data-analytics-period-visitors>—</div>
        <div class="analytics-card-sub" data-analytics-period-label>за последние 30 дней</div>
      </article>
      <article class="analytics-card">
        <div class="analytics-card-label">Просмотров страниц / всего</div>
        <div class="analytics-card-value" data-analytics-pageviews>—</div>
        <div class="analytics-card-sub">включая повторные открытия</div>
      </article>
      <article class="analytics-card">
        <div class="analytics-card-label">Страниц на посетителя</div>
        <div class="analytics-card-value" data-analytics-pages-per-visitor>—</div>
        <div class="analytics-card-sub">среднее за всё время</div>
      </article>
    </section>

    <section class="analytics-grid">
      <article class="analytics-panel">
        <div class="analytics-panel-header">
          <strong data-analytics-chart-title>Просмотры / 30 дней</strong>
          <span>PAGE VIEWS</span>
        </div>
        <div class="analytics-chart-wrap">
          <svg class="analytics-chart" data-analytics-chart viewBox="0 0 900 280" preserveAspectRatio="none" aria-label="График просмотров"></svg>
        </div>
      </article>

      <article class="analytics-panel">
        <div class="analytics-panel-header">
          <strong>Состояние</strong>
          <span>COUNTER API</span>
        </div>
        <div class="analytics-live">
          <div class="analytics-live-row"><span>Самая популярная</span><strong data-analytics-top-page>—</strong></div>
          <div class="analytics-live-row"><span>Обновлено</span><strong data-analytics-updated>—</strong></div>
          <div class="analytics-live-row"><span>Снимок</span><strong data-analytics-status>Загрузка…</strong></div>
          <div class="analytics-live-row"><span>Система</span><strong>ANONYMIZED</strong></div>
        </div>
      </article>
    </section>

    <section class="analytics-panel analytics-pages">
      <div class="analytics-panel-header">
        <strong>Страницы / за всё время</strong>
        <span>PAGE BREAKDOWN</span>
      </div>
      <div class="analytics-table-wrap">
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Страница</th>
              <th class="is-number">Просмотры</th>
              <th class="is-number">Уникальные</th>
              <th class="is-number">% трафика</th>
            </tr>
          </thead>
          <tbody data-analytics-pages-body></tbody>
        </table>
      </div>
      <div class="analytics-empty" data-analytics-empty hidden>
        Счётчик только что установлен. Статистика появится после первого автоматического снимка.
      </div>
    </section>

    <p class="analytics-note">
      «Обновить» перечитывает последний снимок без кеша. Сам снимок собирается GitHub Actions примерно раз в час.
    </p>
  `;
  securityPanel.parentElement.insertBefore(panel, securityPanel);

  initializeAnalyticsDashboard(panel);
}

function drawChart(svg, points) {
  svg.innerHTML = "";
  if (!points.length) return;

  const width = 900;
  const height = 280;
  const padX = 38;
  const padY = 22;
  const values = points.map((point) => Number(point.views) || 0);
  const max = Math.max(1, ...values) * 1.15;

  for (let index = 0; index < 5; index += 1) {
    const y = padY + ((height - padY * 2) * index) / 4;
    svg.insertAdjacentHTML(
      "beforeend",
      `<line class="analytics-gridline" x1="${padX}" x2="${width - 8}" y1="${y}" y2="${y}"></line>`,
    );
  }

  const coords = points.map((point, index) => {
    const x =
      padX +
      (width - padX - 18) *
        (index / Math.max(1, points.length - 1));
    const y =
      height -
      padY -
      ((Number(point.views) || 0) / max) * (height - padY * 2);
    return [x, y];
  });

  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${padX},${height - padY} ${line} ${coords.at(-1)[0]},${height - padY}`;
  svg.insertAdjacentHTML(
    "beforeend",
    `<polygon class="analytics-area" points="${area}"></polygon><polyline class="analytics-line" points="${line}"></polyline>`,
  );

  const labels = [0, Math.floor((coords.length - 1) / 2), coords.length - 1];
  [...new Set(labels)].forEach((index) => {
    const [x, y] = coords[index];
    const text = index === coords.length - 1 ? "сегодня" : `${coords.length - 1 - index}д назад`;
    const anchor = index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle";
    svg.insertAdjacentHTML(
      "beforeend",
      `<circle class="analytics-dot" cx="${x}" cy="${y}" r="4"></circle><text class="analytics-axis" x="${x}" y="${height - 4}" text-anchor="${anchor}">${text}</text>`,
    );
  });
}

function initializeAnalyticsDashboard(panel) {
  let snapshot = null;
  let selectedDays = 30;
  const refreshButton = panel.querySelector("[data-analytics-refresh]");

  const render = () => {
    if (!snapshot) return;
    const summary = snapshot.summary || {};
    const periodKey = selectedDays === 7 ? "last7Days" : "last30Days";
    const period = snapshot.periods?.[periodKey] || {};
    const daily = Array.isArray(snapshot.daily) ? snapshot.daily.slice(-selectedDays) : [];
    const pages = Array.isArray(snapshot.pages) ? snapshot.pages : [];

    panel.querySelector("[data-analytics-total-visitors]").textContent = formatNumber(summary.uniqueVisitors);
    panel.querySelector("[data-analytics-period-visitors]").textContent = formatNumber(period.uniqueVisitors);
    panel.querySelector("[data-analytics-pageviews]").textContent = formatNumber(summary.pageViews);
    panel.querySelector("[data-analytics-pages-per-visitor]").textContent = Number(summary.pagesPerVisitor || 0).toFixed(1);
    panel.querySelector("[data-analytics-period-label]").textContent = `за последние ${selectedDays} дней`;
    panel.querySelector("[data-analytics-chart-title]").textContent = `Просмотры / ${selectedDays} дней`;
    panel.querySelector("[data-analytics-updated]").textContent = formatDate(snapshot.generatedAt);
    panel.querySelector("[data-analytics-status]").textContent = snapshot.ready ? "LIVE SNAPSHOT" : "ОЖИДАЕТ ДАННЫХ";

    const sortedPages = [...pages].sort((a, b) => (b.views || 0) - (a.views || 0));
    panel.querySelector("[data-analytics-top-page]").textContent = sortedPages[0]?.path || "—";

    const body = panel.querySelector("[data-analytics-pages-body]");
    const empty = panel.querySelector("[data-analytics-empty]");
    body.innerHTML = "";
    empty.hidden = sortedPages.length > 0;

    const maxViews = Math.max(1, ...sortedPages.map((page) => Number(page.views) || 0));
    sortedPages.forEach((page) => {
      const share = summary.pageViews
        ? ((Number(page.views) || 0) / Number(summary.pageViews)) * 100
        : 0;
      body.insertAdjacentHTML(
        "beforeend",
        `<tr>
          <td>
            <div class="analytics-path">${escapeHTML(page.path)}</div>
            <div class="analytics-bar"><span style="width:${Math.min(100, ((Number(page.views) || 0) / maxViews) * 100)}%"></span></div>
          </td>
          <td class="is-number">${formatNumber(page.views)}</td>
          <td class="is-number">${formatNumber(page.uniqueVisitors)}</td>
          <td class="is-number">${share.toFixed(1)}%</td>
        </tr>`,
      );
    });

    drawChart(panel.querySelector("[data-analytics-chart]"), daily);
  };

  async function loadSnapshot() {
    const status = panel.querySelector("[data-analytics-status]");
    status.textContent = "ЗАГРУЗКА…";
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "↻ ОБНОВЛЯЮ…";
    }
    try {
      const response = await fetch(`${ANALYTICS_JSON_URL}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      snapshot = await response.json();
      render();
    } catch (error) {
      console.error("Could not load analytics snapshot", error);
      status.textContent = "ОШИБКА ЗАГРУЗКИ";
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ ОБНОВИТЬ";
      }
    }
  }

  panel.querySelectorAll("[data-analytics-days]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDays = Number(button.dataset.analyticsDays) || 30;
      panel
        .querySelectorAll("[data-analytics-days]")
        .forEach((item) => item.classList.toggle("is-active", item === button));
      render();
    });
  });

  refreshButton?.addEventListener("click", loadSnapshot);
  loadSnapshot();
}

installAnalyticsSection();
