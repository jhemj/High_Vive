import assert from "node:assert/strict";
import test from "node:test";

import { classifyDomains, sanitizePrompt } from "../tools/high-vive-history-scan.mjs";

test("sanitizePrompt removes ambient context and common secrets", () => {
  const value = sanitizePrompt(`<in-app-browser-context>private state</in-app-browser-context>
## My request for Codex:
API_KEY=sk-example-secret-value 사용자 test@example.com의 보안 보고서를 검증해줘`);
  assert.equal(value.includes("private state"), false);
  assert.equal(value.includes("test@example.com"), false);
  assert.equal(value.includes("sk-example"), false);
  assert.match(value, /보안 보고서를 검증해줘/);
});
test("classifyDomains supports multi-domain work", () => {
  const domains = classifyDomains("CVE 위협 분석 결과를 CSV 보고서와 dashboard로 만들어줘");
  assert.ok(domains.includes("security"));
  assert.ok(domains.includes("data"));
  assert.ok(domains.every((domain) => [
    "frontend", "backend", "fullstack", "mobile", "data", "aiEngineering",
    "aiOps", "devops", "security", "product",
  ].includes(domain)));
});
