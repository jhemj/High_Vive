import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("defines the localized ELO-first High-Vive leaderboard without season chrome", async () => {
  const [page, layout, app] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /cf-ipcountry/);
  assert.match(page, /<HighViveApp initialLocale=/);
  assert.match(layout, /<html lang=\{locale\}>/);
  assert.match(app, /HIGH-VIVE · VIBE CODER BENCHMARK/);
  assert.match(app, /LEADERBOARD/);
  assert.doesNotMatch(app, /SEASON 01|시즌 01/);
  assert.match(app, /PROVISIONAL TIER/);
  assert.match(app, /BENCHMARK OVR/);
  assert.match(app, /RANKING ELO/);
  assert.match(app, /검증 신뢰도/);
  assert.match(app, /프론트엔드/);
  assert.doesNotMatch(`${app}${layout}`, /�/);
  assert.match(app, /strengthsKo/);
  assert.match(app, /tokenEfficiency/);
  assert.match(app, /claude-code/);
  assert.match(app, /data-card-tier/);
  assert.match(app, /attribute-tooltip/);
  assert.doesNotMatch(app, /<nav className="site-nav"/);
  assert.doesNotMatch(app, /이력서|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps benchmark, persistence, and removed-starter contracts explicit", async () => {
  const [layout, app, api, schema, css, packageJson, hosting, previewFiles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/high-vive-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/passports/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
    readdir(new URL("../app/_sites-preview", import.meta.url)),
  ]);

  assert.match(layout, /High-Vive — Vibe Coder Benchmark League/);
  assert.match(app, /high-vive-witness-v0\.2/);
  assert.match(api, /calculateBenchmarkScore/);
  assert.match(api, /calculatePercentileScores/);
  assert.match(api, /scoreCalibration/);
  assert.match(api, /calculateRankMeta/);
  assert.match(api, /round1\(weighted\)/);
  assert.match(api, /b\.eloRating - a\.eloRating/);
  assert.match(api, /benchmarkScore/);
  assert.match(api, /eloRating/);
  assert.match(api, /tierDivision/);
  assert.match(api, /reliabilityScore/);
  assert.match(api, /application\/json; charset=utf-8/);
  assert.doesNotMatch(api, /witnessLevel|W1|W2|W3|W4/);
  assert.doesNotMatch(app, /witnessLevel|W1|W2|W3|W4/);
  assert.doesNotMatch(schema, /witnessLevel|witness_level/);
  assert.match(schema, /reliabilityScore/);
  assert.match(api, /frontend/);
  assert.match(api, /aiEngineering/);
  assert.match(api, /security/);
  assert.match(css, /\.league-dashboard/);
  assert.match(css, /\.podium-grid/);
  assert.match(packageJson, /"name": "high-vive-benchmark-league"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(hosting, /"d1": "DB"/);
  assert.deepEqual(previewFiles, []);
});
