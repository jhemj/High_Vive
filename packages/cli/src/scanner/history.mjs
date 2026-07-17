import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, opendir, readFile, stat, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { basename, join, relative, resolve, sep } from "node:path";
import {
  CANONICALIZATION_VERSION, PROTOCOL_VERSION, REDACTION_VERSION, SCANNER_VERSION,
} from "@high-vive/protocol";

const MAX_LINE_LENGTH = 2 * 1024 * 1024;

const domainRules = [
  ["security", /\b(cve|threat|security|forensic|malware|vulnerability|soc|siem|xss|csrf|authz|보안|위협|취약점)\b/i],
  ["frontend", /\b(react|next|vue|svelte|css|html|frontend|ui|ux|browser|프론트|화면)\b/i],
  ["backend", /\b(api|backend|server|fastapi|express|database|sql|worker|백엔드|서버)\b/i],
  ["fullstack", /\b(full[ -]?stack|풀스택)\b/i],
  ["mobile", /\b(android|ios|mobile|desktop|electron|tauri|모바일|데스크톱)\b/i],
  ["data", /\b(csv|xlsx|excel|spreadsheet|analytics|pandas|dataset|데이터|분석)\b/i],
  ["aiEngineering", /\b(llm|rag|embedding|model|eval|prompt engineering|머신러닝|모델|평가)\b/i],
  ["aiOps", /\b(agent|automation|workflow|codex|claude code|mcp|orchestrat|자동화|에이전트)\b/i],
  ["devops", /\b(docker|kubernetes|terraform|cloud|deploy|ci\/cd|infra|배포|클라우드|인프라)\b/i],
  ["product", /\b(product|design|content|research|brief|prd|writing|기획|디자인|콘텐츠|리서치)\b/i],
];

const redactionPatterns = [
  [/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi, "[REDACTED_PRIVATE_KEY]"],
  [/\b(?:sk|pk|rk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/gi, "[REDACTED_TOKEN]"],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*\b/gi, "Bearer [REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?\d[\d .()-]{8,}\d)\b/g, "[REDACTED_PHONE]"],
  [/\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g, "[REDACTED_IP]"],
  [/\b[0-9a-f]{0,4}(?::[0-9a-f]{0,4}){2,7}\b/gi, "[REDACTED_IPV6]"],
  [/\b\d{6}-?[1-4]\d{6}\b/g, "[REDACTED_KR_ID]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD]"],
  [/\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*\S+/gi, "$1=[REDACTED]"],
  [/[?&](?:token|key|secret|signature|sig|auth)=[^&\s]+/gi, "?credential=[REDACTED]"],
  [/[A-Za-z0-9+/]{100,}={0,2}/g, "[REDACTED_BASE64]"],
  [/[A-Za-z]:\\Users\\[^\\\s]+/gi, "[REDACTED_HOME]"],
  [/\/(?:Users|home)\/[^/\s]+/g, "/[REDACTED_HOME]"],
  [/\b(?:[a-z0-9-]+\.)+(?:corp|internal|local)\b/gi, "[REDACTED_HOST]"],
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function sanitizePrompt(input, maxLength = 900) {
  let value = String(input ?? "")
    .replace(/<in-app-browser-context[\s\S]*?<\/in-app-browser-context>/gi, " ")
    .replace(/<environment_context[\s\S]*?<\/environment_context>/gi, " ")
    .replace(/<recommended_plugins[\s\S]*?<\/recommended_plugins>/gi, " ")
    .replace(/^## My request for Codex:\s*/im, "");
  for (const [pattern, replacement] of redactionPatterns) value = value.replace(pattern, replacement);
  value = value.replace(/[\t ]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

export function classifyDomains(text) {
  const value = String(text ?? "");
  return domainRules.filter(([, pattern]) => pattern.test(value)).map(([key]) => key);
}

function messageText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part;
    if (!part || typeof part !== "object") return "";
    return typeof part.text === "string" ? part.text : typeof part.input_text === "string" ? part.input_text : "";
  }).filter(Boolean).join("\n");
}

function isSyntheticPrompt(value) {
  return /<(?:environment_context|app-context|permissions instructions|skills_instructions|developer)>/i.test(value)
    || /^You are (?:Codex|an AI assistant)/i.test(value.trim());
}

async function collectJsonlFiles(root) {
  const files = [];
  async function walk(directory) {
    let handle;
    try { handle = await opendir(directory); } catch { return; }
    for await (const entry of handle) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl")) files.push(path);
    }
  }
  await walk(root);
  return files;
}

function extractTimestamp(record) {
  const candidates = [record.timestamp, record.created_at, record.createdAt, record.time, record.payload?.timestamp];
  for (const value of candidates) {
    if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  }
  return null;
}

function extractUserText(record) {
  const role = record.role ?? record.message?.role ?? record.payload?.role ?? record.payload?.message?.role;
  if (role !== "user") return "";
  return messageText(record.content ?? record.message?.content ?? record.payload?.content ?? record.payload?.message?.content);
}

function extractToolName(record) {
  const value = record.name ?? record.tool_name ?? record.payload?.name ?? record.payload?.tool_name;
  return typeof value === "string" ? value.slice(0, 80) : "";
}

async function scanSession(file, codexHome) {
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile()) return null;
  const relativePath = relative(codexHome, file).split(sep).join("/");
  const ref = `session:${sha256(relativePath).slice(0, 24)}`;
  const stream = createReadStream(file, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const normalized = createHash("sha256");
  const domains = new Map();
  const samples = [];
  let records = 0;
  let parsedRecords = 0;
  let invalidRecords = 0;
  let oversizedRecords = 0;
  let userMessages = 0;
  let syntheticMessagesExcluded = 0;
  let toolCalls = 0;
  let verificationPrompts = 0;
  let structuredPrompts = 0;
  let startedAt = null;
  let endedAt = null;

  for await (const line of lines) {
    records += 1;
    normalized.update(line.trimEnd()).update("\n");
    if (Buffer.byteLength(line, "utf8") > MAX_LINE_LENGTH) { oversizedRecords += 1; continue; }
    let record;
    try { record = JSON.parse(line); parsedRecords += 1; } catch { invalidRecords += 1; continue; }
    const timestamp = extractTimestamp(record);
    if (timestamp && (!startedAt || timestamp < startedAt)) startedAt = timestamp;
    if (timestamp && (!endedAt || timestamp > endedAt)) endedAt = timestamp;
    const toolName = extractToolName(record);
    if (toolName) toolCalls += 1;
    const raw = extractUserText(record);
    if (!raw) continue;
    if (isSyntheticPrompt(raw)) { syntheticMessagesExcluded += 1; continue; }
    const text = sanitizePrompt(raw);
    if (!text) continue;
    userMessages += 1;
    if (/\b(test|verify|validate|check|source|evidence|assert|reproduce|검증|확인|근거|테스트)\b/i.test(text)) verificationPrompts += 1;
    if (/\n\s*(?:[-*]|\d+[.)])|#{1,4}\s|\b(?:requirements?|constraints?|acceptance criteria)\b/i.test(raw)) structuredPrompts += 1;
    for (const domain of classifyDomains(text)) domains.set(domain, (domains.get(domain) ?? 0) + 1);
    const weight = Math.min(10, text.length / 120) + (text.includes("\n") ? 2 : 0);
    samples.push({ timestamp, excerpt: text, hash: `sha256:${sha256(text)}`, weight });
  }

  samples.sort((a, b) => b.weight - a.weight || String(a.timestamp).localeCompare(String(b.timestamp)));
  const best = samples[0] ?? null;
  const leaf = {
    ref,
    source: relativePath.startsWith("archived_sessions/") ? "archived_sessions" : "sessions",
    startedAt,
    endedAt,
    records,
    parsedRecords,
    invalidRecords,
    oversizedRecords,
    userMessages,
    syntheticMessagesExcluded,
    toolCalls,
    verificationPrompts,
    structuredPrompts,
    domains: Object.fromEntries([...domains.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    sampleHash: best?.hash ?? null,
    contentHash: `sha256:${normalized.digest("hex")}`,
  };
  return { leaf, leafHash: sha256(canonicalJson(leaf)), privateSample: best ? { ref, timestamp: best.timestamp, excerpt: best.excerpt } : null };
}

export function buildMerkleTree(sessionRecords) {
  const records = [...sessionRecords].sort((a, b) => a.leaf.ref.localeCompare(b.leaf.ref));
  if (!records.length) throw new Error("No session leaves were produced.");
  const levels = [records.map((record) => record.leafHash)];
  while (levels.at(-1).length > 1) {
    const current = levels.at(-1);
    const next = [];
    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1] ?? left;
      next.push(sha256(`${left}:${right}`));
    }
    levels.push(next);
  }
  return { records, levels, root: `sha256:${levels.at(-1)[0]}` };
}

export function merkleProof(tree, recordIndex) {
  const siblings = [];
  let index = recordIndex;
  for (let levelIndex = 0; levelIndex < tree.levels.length - 1; levelIndex += 1) {
    const level = tree.levels[levelIndex];
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : Math.min(index + 1, level.length - 1);
    siblings.push({ position: isRight ? "left" : "right", hash: `sha256:${level[siblingIndex]}` });
    index = Math.floor(index / 2);
  }
  return siblings;
}

export async function scanHistory({ codexHome, progress = () => {} }) {
  const roots = [join(codexHome, "sessions"), join(codexHome, "archived_sessions")];
  const files = (await Promise.all(roots.map(collectJsonlFiles))).flat().sort();
  if (!files.length) throw new Error(`No Codex session JSONL files were found under ${codexHome}.`);
  const sessions = [];
  for (let index = 0; index < files.length; index += 1) {
    const session = await scanSession(files[index], codexHome);
    if (session) sessions.push(session);
    if ((index + 1) % 25 === 0 || index + 1 === files.length) progress(index + 1, files.length);
  }
  const tree = buildMerkleTree(sessions);
  const dates = sessions.flatMap((session) => [session.leaf.startedAt, session.leaf.endedAt]).filter(Boolean).sort();
  const activeDays = new Set(sessions.flatMap((session) => [session.leaf.startedAt?.slice(0, 10), session.leaf.endedAt?.slice(0, 10)]).filter(Boolean));
  const totals = sessions.reduce((aggregate, session) => {
    for (const key of ["records", "parsedRecords", "invalidRecords", "oversizedRecords", "userMessages", "syntheticMessagesExcluded", "toolCalls", "verificationPrompts", "structuredPrompts"]) aggregate[key] += session.leaf[key];
    for (const [domain, count] of Object.entries(session.leaf.domains)) aggregate.domains[domain] = (aggregate.domains[domain] ?? 0) + count;
    return aggregate;
  }, { records: 0, parsedRecords: 0, invalidRecords: 0, oversizedRecords: 0, userMessages: 0, syntheticMessagesExcluded: 0, toolCalls: 0, verificationPrompts: 0, structuredPrompts: 0, domains: {} });
  return {
    schemaVersion: "high-vive.private-evidence.v1",
    protocolVersion: PROTOCOL_VERSION,
    scannerVersion: SCANNER_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    redactionVersion: REDACTION_VERSION,
    generatedAt: new Date().toISOString(),
    privacy: { localOnly: true, rawTranscriptsIncluded: false, absolutePathsIncluded: false, toolArgumentsIncluded: false },
    commitment: {
      historyRoot: tree.root,
      sessionCount: sessions.length,
      recordCount: totals.records,
      activeDays: activeDays.size || 1,
      dateRange: { from: dates[0] ?? new Date().toISOString(), to: dates.at(-1) ?? new Date().toISOString() },
      scannerVersion: SCANNER_VERSION,
      canonicalizationVersion: CANONICALIZATION_VERSION,
      redactionVersion: REDACTION_VERSION,
      scope: { ...totals, activeDaySignal: "session-boundary-days", merkleLeafCount: sessions.length },
    },
    aggregates: totals,
    sessions: tree.records.map((session, index) => ({ ...session, treeIndex: index })),
  };
}

function sampleRank(seed, ref) {
  return sha256(`${seed}:${ref}`);
}

export function selectChallengeSamples(evidence, selectionSeed, maxSamples = 12) {
  const sessions = evidence.sessions.filter((session) => session.privateSample);
  const ordered = [...sessions].sort((a, b) => sampleRank(selectionSeed, a.leaf.ref).localeCompare(sampleRank(selectionSeed, b.leaf.ref)));
  const selected = [];
  const covered = new Set();
  const dates = sessions.map((session) => session.leaf.startedAt).filter(Boolean).sort();
  const first = dates[0] ? Date.parse(dates[0]) : 0;
  const last = dates.at(-1) ? Date.parse(dates.at(-1)) : first;
  function strata(session) {
    const timestamp = session.leaf.startedAt ? Date.parse(session.leaf.startedAt) : first;
    const temporal = last === first ? "middle" : timestamp < first + (last - first) / 3 ? "early" : timestamp > first + 2 * (last - first) / 3 ? "late" : "middle";
    const domain = Object.keys(session.leaf.domains)[0] ?? "uncategorized";
    return [
      `time:${temporal}`,
      `domain:${domain}`,
      `tool:${session.leaf.toolCalls > 0 ? "yes" : "no"}`,
      `verify:${session.leaf.verificationPrompts > 0 ? "yes" : "no"}`,
      `structured:${session.leaf.structuredPrompts > 0 ? "yes" : "no"}`,
    ];
  }
  for (const session of ordered) {
    const keys = strata(session);
    if (selected.length < Math.min(8, maxSamples) || keys.some((key) => !covered.has(key))) {
      selected.push(session);
      keys.forEach((key) => covered.add(key));
    }
    if (selected.length >= maxSamples) break;
  }
  const tree = buildMerkleTree(evidence.sessions);
  return selected.map((session) => {
    const index = tree.records.findIndex((candidate) => candidate.leaf.ref === session.leaf.ref);
    return {
      sampleRef: session.leaf.ref,
      sampleHash: `sha256:${session.leafHash}`,
      leaf: session.leaf,
      siblings: merkleProof(tree, index),
      privateSample: session.privateSample,
      selectionRank: sampleRank(selectionSeed, session.leaf.ref),
      strata: strata(session),
    };
  });
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function defaultCodexHome() {
  return resolve(process.env.CODEX_HOME || join(process.env.USERPROFILE || process.env.HOME || ".", ".codex"));
}

export async function scanPathSize(codexHome) {
  const paths = [join(codexHome, "sessions"), join(codexHome, "archived_sessions")];
  const values = await Promise.all(paths.map(async (path) => {
    try { return { path: basename(path), exists: (await stat(path)).isDirectory() }; } catch { return { path: basename(path), exists: false }; }
  }));
  return values;
}
