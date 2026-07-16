import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("defines the High-Vive leaderboard in the first page surface", async () => {
  const [page, app] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /High-Vive — 바이브코더 벤치마크 리그/);
  assert.match(page, /<HighViveApp \/>/);
  assert.match(app, /HIGH-VIVE · VIBE CODER BENCHMARK/);
  assert.match(app, /SEASON 01/);
  assert.match(app, /LEADERBOARD/);
  assert.match(app, /PROVISIONAL TIER/);
  assert.match(app, /SCORE-BASED ELO/);
  assert.doesNotMatch(app, /이력서|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps benchmark, persistence, and removed-starter contracts explicit", async () => {
  const [layout, app, api, css, packageJson, hosting, previewFiles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/passports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readdir(new URL("../app/_sites-preview", import.meta.url)),
  ]);

  assert.match(layout, /High-Vive — Vibe Coder Benchmark League/);
  assert.match(app, /high-vive-witness-v0\.1/);
  assert.match(api, /calculateBenchmarkScore/);
  assert.match(api, /calculateRankMeta/);
  assert.match(api, /benchmarkScore/);
  assert.match(api, /eloRating/);
  assert.match(api, /tierDivision/);
  assert.match(css, /\.league-dashboard/);
  assert.match(css, /\.podium-grid/);
  assert.match(packageJson, /"name": "high-vive-benchmark-league"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(hosting, /"d1": "DB"/);
  assert.deepEqual(previewFiles, []);
});
