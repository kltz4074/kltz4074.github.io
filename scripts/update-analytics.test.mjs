import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = new URL("./update-analytics.mjs", import.meta.url);
for (const scenario of ["success", "502", "network", "invalid", "recovery", "404", "partial"]) {
  test(scenario, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "analytics-test-"));
    try {
      await fs.mkdir(path.join(root, "content", "projects"), { recursive: true });
      await fs.writeFile(path.join(root, "content", "projects", "index.json"), "[]");
      const output = path.join(root, "content", "analytics.json");
      const previous = '{"ready":true,"generatedAt":"old","summary":{"pageViews":123}}\n';
      await fs.writeFile(output, previous);
      const mock = path.join(root, "mock.mjs");
      await fs.writeFile(mock, `
        const scenario = ${JSON.stringify(scenario)};
        const calls = new Map();
        const realTimeout = globalThis.setTimeout;
        globalThis.setTimeout = (fn, ms, ...args) => realTimeout(fn, ms === 500 || ms === 1000 ? 0 : ms, ...args);
        globalThis.fetch = async (url, options) => {
          if (!options.signal) throw new Error("Missing request timeout");
          const n = (calls.get(url) || 0) + 1;
          calls.set(url, n);
          if (scenario === "network") throw new TypeError("fetch failed");
          if (scenario === "502" || (scenario === "recovery" && n === 1) || (scenario === "partial" && url.includes("/home?"))) return new Response("", { status: 502 });
          if (scenario === "404") return new Response("", { status: 404 });
          return Response.json({ value: scenario === "invalid" ? "broken" : 42 });
        };
      `);
      const result = spawnSync(process.execPath, ["--import", mock, script.pathname], { cwd: root, encoding: "utf8", timeout: 15000 });
      assert.equal(result.status, 0, result.stderr);
      const content = await fs.readFile(output, "utf8");
      if (["502", "network", "invalid", "partial"].includes(scenario)) {
        assert.equal(content, previous);
        assert.match(result.stderr, /snapshot preserved/);
      } else {
        const snapshot = JSON.parse(content);
        assert.equal(snapshot.summary.pageViews, scenario === "404" ? 0 : 42);
        assert.notEqual(snapshot.generatedAt, "old");
        assert.equal(snapshot.daily.length, 30);
        assert.equal(snapshot.pages.length, 6);
      }
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
}
