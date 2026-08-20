import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const NAMESPACE = "kltz4074.github.io";
const ACTION = "pageview";
const OUTPUT = path.join(ROOT, "content", "analytics.json");

function keyForPath(routePath) {
  const normalized = routePath
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "--");
  return normalized || "home";
}

function apiUrl(key, options = {}) {
  const params = new URLSearchParams({ readOnly: "true" });
  for (const [name, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) params.set(name, String(value));
  }
  return `https://counterapi.com/api/${encodeURIComponent(NAMESPACE)}/${encodeURIComponent(ACTION)}/${encodeURIComponent(key)}?${params}`;
}

async function readCounter(key, options = {}) {
  const response = await fetch(apiUrl(key, options), {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) return 0;
  if (!response.ok) {
    throw new Error(`CounterAPI ${response.status} for ${key}`);
  }

  const data = await response.json();
  return Number(data.value) || 0;
}

async function loadRoutes() {
  const routes = ["/", "/projects", "/skills", "/lab", "/gallery", "/guestbook"];
  try {
    const index = JSON.parse(
      await fs.readFile(path.join(ROOT, "content", "projects", "index.json"), "utf8"),
    );
    for (const slug of index) routes.push(`/projects/${slug}`);
  } catch (error) {
    console.warn("Could not read project index:", error.message);
  }
  return [...new Set(routes)];
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function isoDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

const routes = await loadRoutes();

const [totalViews, totalUnique, views7, unique7, views30, unique30] =
  await Promise.all([
    readCounter("any"),
    readCounter("any", { unique: "true" }),
    readCounter("any", { timeline: "7d" }),
    readCounter("any", { timeline: "7d", unique: "true" }),
    readCounter("any", { timeline: "30d" }),
    readCounter("any", { timeline: "30d", unique: "true" }),
  ]);

const cumulative = await mapWithConcurrency(
  Array.from({ length: 30 }, (_, index) => index + 1),
  6,
  (days) => readCounter("any", { timeline: `${days}d` }),
);

const daily = [];
for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
  const window = daysAgo + 1;
  const current = cumulative[window - 1] || 0;
  const previous = window > 1 ? cumulative[window - 2] || 0 : 0;
  daily.push({
    date: isoDateDaysAgo(daysAgo),
    views: Math.max(0, current - previous),
  });
}

const pages = await mapWithConcurrency(routes, 6, async (routePath) => {
  const key = keyForPath(routePath);
  const [views, uniqueVisitors] = await Promise.all([
    readCounter(key),
    readCounter(key, { unique: "true" }),
  ]);
  return { path: routePath, key, views, uniqueVisitors };
});

const snapshot = {
  version: 1,
  ready: true,
  generatedAt: new Date().toISOString(),
  summary: {
    uniqueVisitors: totalUnique,
    pageViews: totalViews,
    pagesPerVisitor: totalUnique > 0 ? totalViews / totalUnique : 0,
  },
  periods: {
    last7Days: { uniqueVisitors: unique7, pageViews: views7 },
    last30Days: { uniqueVisitors: unique30, pageViews: views30 },
  },
  daily,
  pages,
};

await fs.writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`Analytics snapshot written: ${OUTPUT}`);
