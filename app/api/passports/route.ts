import { desc } from "drizzle-orm";
import { ensureDbSchema, getD1, getDb } from "../../../db";
import { passports } from "../../../db/schema";

export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "high-vive-witness-v0.2";

const apiMessages = {
  ko: {
    loadError: "패스포트를 불러오지 못했습니다.",
    protocol: `protocolVersion은 ${PROTOCOL_VERSION}이어야 합니다.`,
    nickname: "nickname은 3–24자의 영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.",
    fields: "고정 분야, 30자 이상의 AI 평가, 강점·보완점, 0–100 범위의 10개 점수를 확인하세요.",
    submitError: "패스포트를 등록하지 못했습니다.",
  },
  en: {
    loadError: "Could not load Passports.",
    protocol: `protocolVersion must be ${PROTOCOL_VERSION}.`,
    nickname: "nickname must contain 3–24 lowercase letters, numbers, or underscores.",
    fields: "Check the fixed category, a 30+ character AI assessment, strengths and gaps, and all ten 0–100 scores.",
    submitError: "Could not register the Passport.",
  },
} as const;

function messagesFor(request: Request) {
  const locale = request.headers.get("x-high-vive-locale") ?? request.headers.get("accept-language") ?? "";
  return apiMessages[locale.toLowerCase().startsWith("ko") ? "ko" : "en"];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

const scoreKeys = [
  "contextPackaging",
  "aiDelegation",
  "verificationDiscipline",
  "iterationQuality",
  "outcomeYield",
  "toolFluency",
  "domainClarity",
  "communicationQuality",
  "creativity",
  "tokenEfficiency",
] as const;

type ScoreKey = (typeof scoreKeys)[number];
type Scores = Record<ScoreKey, number>;

const categoryCatalog = {
  frontend: { ko: "프론트엔드", en: "Frontend" },
  backend: { ko: "백엔드", en: "Backend" },
  fullstack: { ko: "풀스택", en: "Full-stack" },
  mobile: { ko: "모바일·데스크톱", en: "Mobile & Desktop" },
  data: { ko: "데이터·분석", en: "Data & Analytics" },
  aiEngineering: { ko: "AI·ML 엔지니어링", en: "AI & ML Engineering" },
  aiOps: { ko: "AI OPS·자동화", en: "AI Ops & Automation" },
  devops: { ko: "DevOps·클라우드", en: "DevOps, Cloud & Infra" },
  security: { ko: "보안", en: "Security" },
  product: { ko: "제품·디자인·콘텐츠", en: "Product, Design & Content" },
} as const;

type CategoryKey = keyof typeof categoryCatalog;
type ToolKey = "codex" | "claude-code";

const scoreCalibration: Record<ScoreKey, { midpoint: number; spread: number; weight: number }> = {
  contextPackaging: { midpoint: 84, spread: 5.5, weight: 0.12 },
  aiDelegation: { midpoint: 83, spread: 5.5, weight: 0.11 },
  verificationDiscipline: { midpoint: 82, spread: 5.2, weight: 0.14 },
  iterationQuality: { midpoint: 84, spread: 5.4, weight: 0.1 },
  outcomeYield: { midpoint: 82, spread: 5.2, weight: 0.14 },
  toolFluency: { midpoint: 82, spread: 5.8, weight: 0.1 },
  domainClarity: { midpoint: 84, spread: 5.6, weight: 0.08 },
  communicationQuality: { midpoint: 84, spread: 5.8, weight: 0.07 },
  creativity: { midpoint: 82, spread: 6, weight: 0.08 },
  tokenEfficiency: { midpoint: 78, spread: 6.5, weight: 0.06 },
};

type PassportRecord = {
  id: string;
  nickname: string;
  country: string;
  timezone: string;
  contactOptIn: boolean;
  category: CategoryKey;
  primaryDomain: string;
  primaryDomainKo: string;
  primaryDomainEn: string;
  subfields: string[];
  subfieldsKo: string[];
  subfieldsEn: string[];
  summary: string;
  summaryKo: string;
  summaryEn: string;
  strengthsKo: string[];
  strengthsEn: string[];
  weaknessesKo: string[];
  weaknessesEn: string[];
  tools: ToolKey[];
  scores: Scores;
  percentileScores: Scores;
  reliabilityScore: number;
  benchmarkScore: number;
  eloRating: number;
  tier: string;
  tierDivision: string | null;
  confidence: number;
  evidenceCount: number;
  evidenceRoot: string | null;
  protocolVersion: string;
  createdAt: string;
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.normalize("NFC").trim().slice(0, maxLength) : "";
}

function cleanList(value: unknown, maxItems = 4, maxLength = 100) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function parseTools(value: unknown): ToolKey[] {
  const tools = Array.isArray(value) ? value : [];
  const parsed = tools.filter((tool): tool is ToolKey => tool === "codex" || tool === "claude-code");
  return parsed.length ? Array.from(new Set(parsed)) : ["codex"];
}

function categoryFrom(value: unknown): CategoryKey | null {
  const normalized = cleanText(value, 100).toLowerCase().replace(/[\s_&·,/+-]+/g, "-");
  const direct = Object.keys(categoryCatalog).find((key) => key.toLowerCase() === normalized.replace(/-/g, ""));
  if (direct) return direct as CategoryKey;
  if (/front|프론트|ui|react|vue|웹-?ui/.test(normalized)) return "frontend";
  if (/back|백엔드|api|server/.test(normalized)) return "backend";
  if (/full|풀스택/.test(normalized)) return "fullstack";
  if (/mobile|desktop|android|ios|모바일|데스크톱/.test(normalized)) return "mobile";
  if (/data|analytics|spreadsheet|데이터|분석/.test(normalized)) return "data";
  if (/machine|ml|model|rag|ai-engine|ai·ml/.test(normalized)) return "aiEngineering";
  if (/ai-?ops|automation|agent|workflow|ai-operations|ai-기반-보안/.test(normalized)) return "aiOps";
  if (/devops|cloud|infra|docker|kubernetes|클라우드|인프라/.test(normalized)) return "devops";
  if (/security|threat|forensic|보안|위협/.test(normalized)) return "security";
  if (/product|design|content|research|제품|디자인|콘텐츠|리서치/.test(normalized)) return "product";
  return null;
}

function parseCategory(value: string) {
  try {
    const parsed = JSON.parse(value) as { slug?: unknown; ko?: unknown; en?: unknown };
    const slug = categoryFrom(parsed.slug) ?? categoryFrom(parsed.en) ?? categoryFrom(parsed.ko);
    if (slug) return slug;
  } catch {
    // Legacy rows store one free-form domain string.
  }
  return categoryFrom(value) ?? "product";
}

function parseLocalizedList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const items = cleanList(parsed, 4, 50);
      return { ko: items, en: items, tools: ["codex"] as ToolKey[] };
    }
    if (parsed && typeof parsed === "object") {
      const source = parsed as { ko?: unknown; en?: unknown; tools?: unknown };
      const ko = cleanList(source.ko, 4, 50);
      const en = cleanList(source.en, 4, 50);
      return { ko: ko.length ? ko : en, en: en.length ? en : ko, tools: parseTools(source.tools) };
    }
  } catch {
    // Invalid legacy data becomes an empty list.
  }
  return { ko: [] as string[], en: [] as string[], tools: ["codex"] as ToolKey[] };
}

function parseNarrative(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const ko = cleanText(parsed.ko, 500);
      const en = cleanText(parsed.en, 500);
      return {
        ko: ko || en,
        en: en || ko,
        strengthsKo: cleanList(parsed.strengthsKo, 3, 140),
        strengthsEn: cleanList(parsed.strengthsEn, 3, 140),
        weaknessesKo: cleanList(parsed.weaknessesKo, 3, 140),
        weaknessesEn: cleanList(parsed.weaknessesEn, 3, 140),
      };
    }
  } catch {
    // Legacy rows store one summary string.
  }
  return {
    ko: value,
    en: value,
    strengthsKo: ["AI 협업을 실제 결과물로 연결하는 패턴이 확인됩니다."],
    strengthsEn: ["Shows a repeatable pattern of turning AI collaboration into deliverables."],
    weaknessesKo: ["외부 검증과 장기 비교 데이터가 더 필요합니다."],
    weaknessesEn: ["Needs broader external verification and longitudinal comparison data."],
  };
}

function parseScores(value: unknown, allowLegacy = false): Scores | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const scores = {} as Scores;
  for (const key of scoreKeys) {
    let score = source[key];
    if (allowLegacy && score === undefined && key === "creativity") {
      score = (Number(source.iterationQuality) + Number(source.domainClarity)) / 2;
    }
    if (allowLegacy && score === undefined && key === "tokenEfficiency") {
      score = (Number(source.aiDelegation) + Number(source.outcomeYield)) / 2 - 5;
    }
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) return null;
    scores[key] = round1(score);
  }
  return scores;
}

function calculatePercentileScores(scores: Scores) {
  const result = {} as Scores;
  for (const key of scoreKeys) {
    const calibration = scoreCalibration[key];
    result[key] = round1(100 / (1 + Math.exp(-(scores[key] - calibration.midpoint) / calibration.spread)));
  }
  return result;
}

function calculateBenchmarkScore(scores: Scores) {
  const percentiles = calculatePercentileScores(scores);
  const weighted = scoreKeys.reduce(
    (total, key) => total + percentiles[key] * scoreCalibration[key].weight,
    0,
  );
  return { benchmarkScore: round1(weighted), percentileScores: percentiles };
}

function calculateReliability(input: {
  evidenceCount: number;
  confidence: number;
  evidenceRoot: string | null;
  dateRangeDays: number;
  externalValidationCount: number;
}) {
  const scope = Math.min(25, Math.log10(Math.max(1, input.evidenceCount) + 1) * 10);
  const confidence = Math.min(20, Math.max(0, input.confidence * 20));
  const integrity = input.evidenceRoot ? 15 : 0;
  const continuity = Math.min(15, Math.log10(Math.max(1, input.dateRangeDays) + 1) * 9);
  const external = Math.min(20, Math.max(0, input.externalValidationCount) * 5);
  return round1(Math.min(100, 5 + scope + confidence + integrity + continuity + external));
}

const tierBands = [
  { name: "Iron", min: 0, max: 699 },
  { name: "Bronze", min: 700, max: 899 },
  { name: "Silver", min: 900, max: 1099 },
  { name: "Gold", min: 1100, max: 1249 },
  { name: "Platinum", min: 1250, max: 1399 },
  { name: "Emerald", min: 1400, max: 1499 },
  { name: "Diamond", min: 1500, max: 1574 },
  { name: "Master", min: 1575, max: 1624 },
  { name: "Grandmaster", min: 1625, max: 1674 },
  { name: "Challenger", min: 1675, max: Number.POSITIVE_INFINITY },
] as const;

function calculateRankMeta(benchmarkScore: number, reliabilityScore: number) {
  const eloRating = Math.round(650 + benchmarkScore * 10 + reliabilityScore * 1.5);
  const band = tierBands.find((item) => eloRating >= item.min && eloRating <= item.max) ?? tierBands[0];
  const divisionless = ["Master", "Grandmaster", "Challenger"].includes(band.name);
  let tierDivision: string | null = null;
  if (!divisionless) {
    const width = band.max - band.min + 1;
    const progress = Math.min(0.999, Math.max(0, (eloRating - band.min) / width));
    tierDivision = ["IV", "III", "II", "I"][Math.floor(progress * 4)];
  }
  return { eloRating, tier: band.name, tierDivision };
}

function asPassport(row: typeof passports.$inferSelect): PassportRecord {
  const scores = parseScores(JSON.parse(row.scoresJson) as unknown, true)!;
  const { benchmarkScore, percentileScores } = calculateBenchmarkScore(scores);
  const subfields = parseLocalizedList(row.subfieldsJson);
  const narrative = parseNarrative(row.summary);
  const category = parseCategory(row.primaryDomain);
  const reliabilityScore = row.reliabilityScore;
  return {
    id: row.id,
    nickname: row.nickname,
    country: row.country,
    timezone: row.timezone,
    contactOptIn: row.contactOptIn,
    category,
    primaryDomain: categoryCatalog[category].en,
    primaryDomainKo: categoryCatalog[category].ko,
    primaryDomainEn: categoryCatalog[category].en,
    subfields: subfields.en,
    subfieldsKo: subfields.ko,
    subfieldsEn: subfields.en,
    summary: narrative.en,
    summaryKo: narrative.ko,
    summaryEn: narrative.en,
    strengthsKo: narrative.strengthsKo,
    strengthsEn: narrative.strengthsEn,
    weaknessesKo: narrative.weaknessesKo,
    weaknessesEn: narrative.weaknessesEn,
    tools: subfields.tools,
    scores,
    percentileScores,
    reliabilityScore,
    benchmarkScore,
    ...calculateRankMeta(benchmarkScore, reliabilityScore),
    confidence: row.confidence,
    evidenceCount: row.evidenceCount,
    evidenceRoot: row.evidenceRoot,
    protocolVersion: row.protocolVersion,
    createdAt: row.createdAt,
  };
}

function makeSeed(input: Omit<PassportRecord, "percentileScores" | "benchmarkScore" | "eloRating" | "tier" | "tierDivision">): PassportRecord {
  const { benchmarkScore, percentileScores } = calculateBenchmarkScore(input.scores);
  return {
    ...input,
    percentileScores,
    benchmarkScore,
    ...calculateRankMeta(benchmarkScore, input.reliabilityScore),
  };
}

const seededPassports: PassportRecord[] = [
  makeSeed({
    id: "seed_ops_fox", nickname: "ops_fox", country: "KR", timezone: "Asia/Seoul", contactOptIn: true,
    category: "aiOps", primaryDomain: "AI Ops & Automation", primaryDomainKo: "AI OPS·자동화", primaryDomainEn: "AI Ops & Automation",
    subfields: ["Support Automation", "SOP Design"], subfieldsKo: ["고객지원 자동화", "SOP 설계"], subfieldsEn: ["Support Automation", "SOP Design"],
    summary: "Turns complex operational requests into executable procedures and verifies outcomes.",
    summaryKo: "복잡한 운영 요청을 실행 가능한 절차로 바꾸고 결과를 반복 검증합니다.", summaryEn: "Turns complex operational requests into executable procedures and verifies outcomes.",
    strengthsKo: ["운영 요구사항을 반복 가능한 자동화 절차로 구조화합니다.", "결과물을 실제 운영 환경에서 확인합니다."], strengthsEn: ["Structures operations work into repeatable automation.", "Checks deliverables in real operating environments."],
    weaknessesKo: ["수치 검증 자동화의 일관성을 더 높일 수 있습니다."], weaknessesEn: ["Can improve consistency in automated numerical validation."],
    tools: ["codex", "claude-code"],
    scores: { contextPackaging: 91.2, aiDelegation: 87.4, verificationDiscipline: 78.3, iterationQuality: 84.6, outcomeYield: 88.2, toolFluency: 82.7, domainClarity: 82.1, communicationQuality: 90.3, creativity: 83.8, tokenEfficiency: 76.4 },
    reliabilityScore: 86.4, confidence: 0.91, evidenceCount: 118, evidenceRoot: "sha256:2a41b7c93e0d", protocolVersion: PROTOCOL_VERSION, createdAt: "2026-07-16T09:30:00.000Z",
  }),
  makeSeed({
    id: "seed_sheet_monk", nickname: "sheet_monk", country: "SG", timezone: "Asia/Singapore", contactOptIn: true,
    category: "data", primaryDomain: "Data & Analytics", primaryDomainKo: "데이터·분석", primaryDomainEn: "Data & Analytics",
    subfields: ["Spreadsheet AI", "Workflow QA"], subfieldsKo: ["스프레드시트 AI", "워크플로 QA"], subfieldsEn: ["Spreadsheet AI", "Workflow QA"],
    summary: "Converts large tabular datasets into reusable rules and verifiable processing steps.",
    summaryKo: "대량의 표 데이터를 재사용 가능한 규칙과 검증 단계로 전환합니다.", summaryEn: "Converts large tabular datasets into reusable rules and verifiable processing steps.",
    strengthsKo: ["표 데이터 정제와 검증 자동화가 강합니다.", "도구를 연결해 반복 작업을 줄입니다."], strengthsEn: ["Strong at tabular cleanup and validation automation.", "Connects tools to reduce repetitive work."],
    weaknessesKo: ["의사결정 맥락을 설명하는 문서화는 상대적으로 약합니다."], weaknessesEn: ["Decision-context documentation is comparatively weaker."],
    tools: ["claude-code"],
    scores: { contextPackaging: 84.1, aiDelegation: 90.3, verificationDiscipline: 91.4, iterationQuality: 82.2, outcomeYield: 86.3, toolFluency: 93.1, domainClarity: 80.4, communicationQuality: 76.2, creativity: 80.8, tokenEfficiency: 88.6 },
    reliabilityScore: 78.2, confidence: 0.86, evidenceCount: 85, evidenceRoot: "sha256:85bda7f19a62", protocolVersion: PROTOCOL_VERSION, createdAt: "2026-07-12T04:20:00.000Z",
  }),
  makeSeed({
    id: "seed_brief_cat", nickname: "brief_cat", country: "CA", timezone: "America/Vancouver", contactOptIn: false,
    category: "product", primaryDomain: "Product, Design & Content", primaryDomainKo: "제품·디자인·콘텐츠", primaryDomainEn: "Product, Design & Content",
    subfields: ["Research Briefing", "Editorial QA"], subfieldsKo: ["리서치 브리핑", "편집 QA"], subfieldsEn: ["Research Briefing", "Editorial QA"],
    summary: "Synthesizes fragmented sources into evidence-led decision briefs with explicit uncertainty.",
    summaryKo: "흩어진 자료를 근거 중심의 의사결정 브리프로 정리하고 불확실성을 명시합니다.", summaryEn: "Synthesizes fragmented sources into evidence-led decision briefs with explicit uncertainty.",
    strengthsKo: ["자료의 불확실성과 출처를 명확하게 구분합니다.", "독자가 판단하기 쉬운 구조로 재구성합니다."], strengthsEn: ["Separates uncertainty from sourced facts.", "Restructures material for decision-ready reading."],
    weaknessesKo: ["코드·자동화 기반 재현성 근거가 더 필요합니다."], weaknessesEn: ["Needs more code- and automation-based reproducibility evidence."],
    tools: ["codex"],
    scores: { contextPackaging: 89.4, aiDelegation: 79.3, verificationDiscipline: 88.1, iterationQuality: 81.6, outcomeYield: 83.2, toolFluency: 69.5, domainClarity: 91.3, communicationQuality: 94.1, creativity: 90.2, tokenEfficiency: 71.4 },
    reliabilityScore: 70.7, confidence: 0.79, evidenceCount: 42, evidenceRoot: "sha256:1f63a42b7c91", protocolVersion: PROTOCOL_VERSION, createdAt: "2026-07-08T18:05:00.000Z",
  }),
];

async function hashEvidence(values: string[]) {
  if (!values.length) return null;
  const bytes = new TextEncoder().encode(values.sort().join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export async function GET(request: Request) {
  const messages = messagesFor(request);
  try {
    await ensureDbSchema();
    const stored = await getDb().select().from(passports).orderBy(desc(passports.createdAt)).limit(50);
    const merged = [...stored.map(asPassport), ...seededPassports]
      .filter((passport, index, all) => all.findIndex((candidate) => candidate.nickname === passport.nickname) === index)
      .sort((a, b) => b.eloRating - a.eloRating || b.benchmarkScore - a.benchmarkScore);
    return jsonResponse({ passports: merged, protocolVersion: PROTOCOL_VERSION, categories: categoryCatalog });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : messages.loadError }, 500);
  }
}

export async function POST(request: Request) {
  const messages = messagesFor(request);
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (payload.protocolVersion !== PROTOCOL_VERSION) return jsonResponse({ error: messages.protocol }, 400);
    const candidate = payload.candidate && typeof payload.candidate === "object" ? payload.candidate as Record<string, unknown> : {};
    const witness = payload.codexWitness && typeof payload.codexWitness === "object" ? payload.codexWitness as Record<string, unknown> : {};
    const nickname = cleanText(candidate.nickname, 24).toLowerCase();
    const category = categoryFrom(payload.category) ?? categoryFrom(payload.primaryDomain);
    const summaryKo = cleanText(witness.summaryKo, 500) || cleanText(witness.summary, 500);
    const summaryEn = cleanText(witness.summaryEn, 500) || cleanText(witness.summary, 500);
    const strengthsKo = cleanList(witness.strengthsKo, 3, 140);
    const strengthsEn = cleanList(witness.strengthsEn, 3, 140);
    const weaknessesKo = cleanList(witness.weaknessesKo, 3, 140);
    const weaknessesEn = cleanList(witness.weaknessesEn, 3, 140);
    const scores = parseScores(payload.scores);
    if (!/^[a-z0-9_]{3,24}$/.test(nickname)) return jsonResponse({ error: messages.nickname }, 400);
    if (!category || Math.max(summaryKo.length, summaryEn.length) < 30 || !scores || !(strengthsKo.length || strengthsEn.length) || !(weaknessesKo.length || weaknessesEn.length)) {
      return jsonResponse({ error: messages.fields }, 400);
    }

    const subfieldsKo = cleanList(payload.subfieldsKo ?? payload.subfields, 4, 50);
    const subfieldsEn = cleanList(payload.subfieldsEn ?? payload.subfields, 4, 50);
    const tools = parseTools(payload.tools);
    const evidenceHashes = Array.isArray(payload.evidenceHashes)
      ? payload.evidenceHashes.map((item) => item && typeof item === "object" ? cleanText((item as Record<string, unknown>).hash, 90).toLowerCase() : "").filter((hash) => /^sha256:[a-f0-9]{8,64}$/.test(hash)).slice(0, 50)
      : [];
    const scope = payload.evidenceScope && typeof payload.evidenceScope === "object" ? payload.evidenceScope as Record<string, unknown> : {};
    const filesIndexed = Number.isFinite(Number(scope.filesIndexed)) ? Math.max(0, Math.min(Number(scope.filesIndexed), 1000000)) : 0;
    const codexSessionsIndexed = Number.isFinite(Number(scope.codexSessionsIndexed)) ? Math.max(0, Math.min(Number(scope.codexSessionsIndexed), 100000)) : 0;
    const claudeSessionsIndexed = Number.isFinite(Number(scope.claudeSessionsIndexed)) ? Math.max(0, Math.min(Number(scope.claudeSessionsIndexed), 100000)) : 0;
    const evidenceCount = Math.round(Math.max(codexSessionsIndexed + claudeSessionsIndexed, filesIndexed, evidenceHashes.length));
    const confidence = round1(Math.min(0.95, 0.5 + Math.min(0.2, evidenceHashes.length * 0.02) + Math.min(0.2, evidenceCount / 500) + Math.min(0.05, filesIndexed / 2000)) * 100) / 100;
    const evidenceRoot = await hashEvidence(evidenceHashes);
    const dateRangeDays = Number.isFinite(Number(scope.dateRangeDays)) ? Math.max(0, Math.min(Number(scope.dateRangeDays), 3650)) : 0;
    const externalValidationCount = Number.isFinite(Number(scope.externalValidationCount)) ? Math.max(0, Math.min(Number(scope.externalValidationCount), 100)) : 0;
    const reliabilityScore = calculateReliability({ evidenceCount, confidence, evidenceRoot, dateRangeDays, externalValidationCount });
    const { benchmarkScore, percentileScores } = calculateBenchmarkScore(scores);
    const rankMeta = calculateRankMeta(benchmarkScore, reliabilityScore);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await ensureDbSchema();
    await getD1().prepare(
      `INSERT INTO passports (
        id, nickname, country, timezone, contact_opt_in, primary_domain,
        subfields_json, summary, scores_json, reliability_score, benchmark_score,
        confidence, evidence_count, evidence_root, protocol_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(nickname) DO UPDATE SET
        id = excluded.id, country = excluded.country, timezone = excluded.timezone,
        contact_opt_in = excluded.contact_opt_in, primary_domain = excluded.primary_domain,
        subfields_json = excluded.subfields_json, summary = excluded.summary,
        scores_json = excluded.scores_json, reliability_score = excluded.reliability_score,
        benchmark_score = excluded.benchmark_score, confidence = excluded.confidence,
        evidence_count = excluded.evidence_count, evidence_root = excluded.evidence_root,
        protocol_version = excluded.protocol_version, created_at = excluded.created_at`,
    ).bind(
      id, nickname, cleanText(candidate.country, 4).toUpperCase(), cleanText(candidate.timezone, 50), candidate.contactOptIn === true ? 1 : 0,
      JSON.stringify({ slug: category, ko: categoryCatalog[category].ko, en: categoryCatalog[category].en }),
      JSON.stringify({ ko: subfieldsKo.length ? subfieldsKo : subfieldsEn, en: subfieldsEn.length ? subfieldsEn : subfieldsKo, tools }),
      JSON.stringify({ ko: summaryKo || summaryEn, en: summaryEn || summaryKo, strengthsKo: strengthsKo.length ? strengthsKo : strengthsEn, strengthsEn: strengthsEn.length ? strengthsEn : strengthsKo, weaknessesKo: weaknessesKo.length ? weaknessesKo : weaknessesEn, weaknessesEn: weaknessesEn.length ? weaknessesEn : weaknessesKo }),
      JSON.stringify(scores), reliabilityScore, benchmarkScore, confidence, evidenceCount, evidenceRoot, PROTOCOL_VERSION, now,
    ).run();

    const passport: PassportRecord = {
      id, nickname, country: cleanText(candidate.country, 4).toUpperCase(), timezone: cleanText(candidate.timezone, 50), contactOptIn: candidate.contactOptIn === true,
      category, primaryDomain: categoryCatalog[category].en, primaryDomainKo: categoryCatalog[category].ko, primaryDomainEn: categoryCatalog[category].en,
      subfields: subfieldsEn.length ? subfieldsEn : subfieldsKo, subfieldsKo: subfieldsKo.length ? subfieldsKo : subfieldsEn, subfieldsEn: subfieldsEn.length ? subfieldsEn : subfieldsKo,
      summary: summaryEn || summaryKo, summaryKo: summaryKo || summaryEn, summaryEn: summaryEn || summaryKo,
      strengthsKo: strengthsKo.length ? strengthsKo : strengthsEn, strengthsEn: strengthsEn.length ? strengthsEn : strengthsKo,
      weaknessesKo: weaknessesKo.length ? weaknessesKo : weaknessesEn, weaknessesEn: weaknessesEn.length ? weaknessesEn : weaknessesKo,
      tools, scores, percentileScores, reliabilityScore, benchmarkScore, ...rankMeta,
      confidence, evidenceCount, evidenceRoot, protocolVersion: PROTOCOL_VERSION, createdAt: now,
    };
    return jsonResponse({ passport }, 201);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : messages.submitError }, 500);
  }
}
