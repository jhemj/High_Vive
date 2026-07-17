import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildMerkleTree, classifyDomains, sanitizePrompt, scanHistory, selectChallengeSamples,
} from "../packages/cli/src/scanner/history.mjs";

test("sanitizePrompt removes ambient context and credential patterns", () => {
  const value = sanitizePrompt(`<in-app-browser-context>private state</in-app-browser-context>
## My request for Codex:
API_KEY=sk-example-secret-value 사용자 test@example.com의 010-1234-5678 보안 보고서를 검증해줘`);
  assert.equal(value.includes("private state"), false);
  assert.equal(value.includes("test@example.com"), false);
  assert.equal(value.includes("sk-example"), false);
  assert.equal(value.includes("010-1234-5678"), false);
  assert.match(value, /보안 보고서를 검증해줘/);
});

test("classifyDomains is bounded to the ten fixed categories", () => {
  const domains = classifyDomains("CVE 위협 분석 결과를 CSV dashboard와 API로 만들어줘");
  assert.ok(domains.includes("security"));
  assert.ok(domains.includes("data"));
  assert.ok(domains.every((domain) => [
    "frontend", "backend", "fullstack", "mobile", "data", "aiEngineering",
    "aiOps", "devops", "security", "product",
  ].includes(domain)));
});

test("same history and seed produce the same root and samples", async () => {
  const root = await mkdtemp(join(tmpdir(), "high-vive-scan-"));
  const sessions = join(root, "sessions", "2026", "07");
  const archived = join(root, "archived_sessions");
  await mkdir(sessions, { recursive: true });
  await mkdir(archived, { recursive: true });
  for (let index = 0; index < 6; index += 1) {
    const rows = [
      { timestamp: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`, role: "user", content: `요구사항 ${index}를 구현하고 테스트로 검증해줘. security API ${index}` },
      { timestamp: `2026-07-${String(index + 1).padStart(2, "0")}T00:01:00.000Z`, name: "shell_command" },
    ];
    await writeFile(join(index % 2 ? archived : sessions, `session-${index}.jsonl`), rows.map(JSON.stringify).join("\n"));
  }
  const first = await scanHistory({ codexHome: root });
  const second = await scanHistory({ codexHome: root });
  assert.equal(first.commitment.historyRoot, second.commitment.historyRoot);
  const a = selectChallengeSamples(first, "hv_seed_fixed", 4).map((sample) => sample.sampleRef);
  const b = selectChallengeSamples(second, "hv_seed_fixed", 4).map((sample) => sample.sampleRef);
  assert.deepEqual(a, b);
  assert.equal(first.commitment.sessionCount, 6);
  assert.equal(first.privacy.rawTranscriptsIncluded, false);
});

test("Merkle root changes when a leaf changes", () => {
  const one = buildMerkleTree([{ leaf: { ref: "a" }, leafHash: "a".repeat(64) }, { leaf: { ref: "b" }, leafHash: "b".repeat(64) }]);
  const two = buildMerkleTree([{ leaf: { ref: "a" }, leafHash: "a".repeat(64) }, { leaf: { ref: "b" }, leafHash: "c".repeat(64) }]);
  assert.notEqual(one.root, two.root);
});
