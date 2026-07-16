import { desc } from "drizzle-orm";
import { ensureDbSchema, getD1, getDb } from "../../../db";
import { passports } from "../../../db/schema";

export const dynamic = "force-dynamic";

const PROTOCOL_VERSION = "high-vive-witness-v0.1";

const apiMessages = {
  ko: {
    loadError: "Passport를 불러오지 못했습니다.",
    protocol: `protocolVersion은 ${PROTOCOL_VERSION}이어야 합니다.`,
    nickname: "nickname은 3–24자의 영문 소문자, 숫자, 밑줄만 사용할 수 있습니다.",
    fields: "분야, 30자 이상의 Codex 요약, 0–100 범위의 8개 점수를 확인하세요.",
    submitError: "Passport를 등록하지 못했습니다.",
  },
  en: {
    loadError: "Could not load Passports.",
    protocol: `protocolVersion must be ${PROTOCOL_VERSION}.`,
    nickname: "nickname must contain 3–24 lowercase letters, numbers, or underscores.",
    fields: "Check the field, a Codex summary of at least 30 characters, and all eight scores from 0–100.",
    submitError: "Could not register the Passport.",
  },
} as const;

function messagesFor(request: Request) {
  const locale = request.headers.get("x-high-vive-locale") ?? request.headers.get("accept-language") ?? "";
  return apiMessages[locale.toLowerCase().startsWith("ko") ? "ko" : "en"];
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
] as const;

type ScoreKey = (typeof scoreKeys)[number];
type Scores = Record<ScoreKey, number>;

type PassportRecord = {
  id: string;
  nickname: string;
  country: string;
  timezone: string;
  contactOptIn: boolean;
  primaryDomain: string;
  primaryDomainKo?: string;
  primaryDomainEn?: string;
  subfields: string[];
  subfieldsKo?: string[];
  subfieldsEn?: string[];
  summary: string;
  summaryKo?: string;
  summaryEn?: string;
  scores: Scores;
  witnessLevel: string;
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

const seededPassports: PassportRecord[] = [
  {
    id: "seed_ops_fox",
    nickname: "ops_fox",
    country: "KR",
    timezone: "Asia/Seoul",
    contactOptIn: true,
    primaryDomain: "AI Operations",
    subfields: ["Support Automation", "SOP Design", "Reporting"],
    summary:
      "복잡한 운영 요청을 실행 가능한 절차로 바꾸고, AI 결과를 반복 검증해 실제 운영 산출물로 연결합니다.",
    scores: {
      contextPackaging: 91,
      aiDelegation: 87,
      verificationDiscipline: 78,
      iterationQuality: 84,
      outcomeYield: 88,
      toolFluency: 72,
      domainClarity: 82,
      communicationQuality: 90,
    },
    witnessLevel: "W4",
    benchmarkScore: 91,
    eloRating: 1587,
    tier: "Platinum",
    tierDivision: "II",
    confidence: 0.91,
    evidenceCount: 118,
    evidenceRoot: "sha256:2a41b7c93e0d",
    protocolVersion: PROTOCOL_VERSION,
    createdAt: "2026-07-16T09:30:00.000Z",
  },
  {
    id: "seed_sheet_monk",
    nickname: "sheet_monk",
    country: "SG",
    timezone: "Asia/Singapore",
    contactOptIn: true,
    primaryDomain: "Data Operations",
    subfields: ["Spreadsheet AI", "Data Cleanup", "Workflow QA"],
    summary:
      "대량의 표 데이터를 재사용 가능한 규칙과 검증 단계로 바꾸는 데 강점이 있습니다.",
    scores: {
      contextPackaging: 84,
      aiDelegation: 90,
      verificationDiscipline: 91,
      iterationQuality: 82,
      outcomeYield: 86,
      toolFluency: 93,
      domainClarity: 80,
      communicationQuality: 76,
    },
    witnessLevel: "W3",
    benchmarkScore: 88,
    eloRating: 1534,
    tier: "Platinum",
    tierDivision: "IV",
    confidence: 0.86,
    evidenceCount: 85,
    evidenceRoot: "sha256:85bda7f19a62",
    protocolVersion: PROTOCOL_VERSION,
    createdAt: "2026-07-12T04:20:00.000Z",
  },
  {
    id: "seed_brief_cat",
    nickname: "brief_cat",
    country: "CA",
    timezone: "America/Vancouver",
    contactOptIn: false,
    primaryDomain: "Research",
    subfields: ["Research Briefing", "Source Synthesis", "Editorial QA"],
    summary:
      "흩어진 자료를 근거가 분명한 의사결정 브리프로 정리하고 불확실성을 명시합니다.",
    scores: {
      contextPackaging: 89,
      aiDelegation: 79,
      verificationDiscipline: 88,
      iterationQuality: 81,
      outcomeYield: 83,
      toolFluency: 69,
      domainClarity: 91,
      communicationQuality: 94,
    },
    witnessLevel: "W2",
    benchmarkScore: 86,
    eloRating: 1486,
    tier: "Gold",
    tierDivision: "I",
    confidence: 0.79,
    evidenceCount: 42,
    evidenceRoot: "sha256:1f63a42b7c91",
    protocolVersion: PROTOCOL_VERSION,
    createdAt: "2026-07-08T18:05:00.000Z",
  },
];

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseLocalizedText(value: string) {
  try {
    const parsed = JSON.parse(value) as { ko?: unknown; en?: unknown };
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const ko = cleanText(parsed.ko, 420);
      const en = cleanText(parsed.en, 420);
      if (ko || en) return { ko: ko || en, en: en || ko };
    }
  } catch {
    // Legacy rows stored a single display string.
  }
  return { ko: value, en: value };
}

function parseLocalizedList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const items = parsed.map((item) => cleanText(item, 40)).filter(Boolean);
      return { ko: items, en: items };
    }
    if (parsed && typeof parsed === "object") {
      const source = parsed as { ko?: unknown; en?: unknown };
      const ko = Array.isArray(source.ko) ? source.ko.map((item) => cleanText(item, 40)).filter(Boolean) : [];
      const en = Array.isArray(source.en) ? source.en.map((item) => cleanText(item, 40)).filter(Boolean) : [];
      return { ko: ko.length ? ko : en, en: en.length ? en : ko };
    }
  } catch {
    // Invalid legacy data becomes an empty list instead of breaking the leaderboard.
  }
  return { ko: [] as string[], en: [] as string[] };
}

function parseScores(value: unknown): Scores | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const scores = {} as Scores;

  for (const key of scoreKeys) {
    const score = source[key];
    if (!Number.isInteger(score) || (score as number) < 0 || (score as number) > 100) {
      return null;
    }
    scores[key] = score as number;
  }
  return scores;
}

function calculateBenchmarkScore(scores: Scores) {
  const weighted =
    scores.contextPackaging * 0.18 +
    scores.aiDelegation * 0.16 +
    scores.verificationDiscipline * 0.18 +
    scores.iterationQuality * 0.12 +
    scores.outcomeYield * 0.16 +
    scores.toolFluency * 0.08 +
    scores.domainClarity * 0.06 +
    scores.communicationQuality * 0.06;
  return Math.round(weighted);
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

function calculateRankMeta(benchmarkScore: number, witnessLevel: string) {
  const trustBonus: Record<string, number> = {
    W0: 0,
    W1: 0,
    W2: 25,
    W3: 50,
    W4: 75,
    W5: 100,
  };
  const normalizedOvr = benchmarkScore > 100 ? Math.round(benchmarkScore / 10) : benchmarkScore;
  const eloRating = 600 + normalizedOvr * 10 + (trustBonus[witnessLevel] ?? 0);
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
  const benchmarkScore = row.benchmarkScore > 100 ? Math.round(row.benchmarkScore / 10) : row.benchmarkScore;
  const rankMeta = calculateRankMeta(benchmarkScore, row.witnessLevel);
  const primaryDomain = parseLocalizedText(row.primaryDomain);
  const subfields = parseLocalizedList(row.subfieldsJson);
  const summary = parseLocalizedText(row.summary);
  return {
    id: row.id,
    nickname: row.nickname,
    country: row.country,
    timezone: row.timezone,
    contactOptIn: row.contactOptIn,
    primaryDomain: primaryDomain.en,
    primaryDomainKo: primaryDomain.ko,
    primaryDomainEn: primaryDomain.en,
    subfields: subfields.en,
    subfieldsKo: subfields.ko,
    subfieldsEn: subfields.en,
    summary: summary.en,
    summaryKo: summary.ko,
    summaryEn: summary.en,
    scores: JSON.parse(row.scoresJson) as Scores,
    witnessLevel: row.witnessLevel,
    benchmarkScore,
    ...rankMeta,
    confidence: row.confidence,
    evidenceCount: row.evidenceCount,
    evidenceRoot: row.evidenceRoot,
    protocolVersion: row.protocolVersion,
    createdAt: row.createdAt,
  };
}

async function hashEvidence(values: string[]) {
  if (!values.length) return null;
  const bytes = new TextEncoder().encode(values.sort().join("|"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

export async function GET(request: Request) {
  const messages = messagesFor(request);
  try {
    await ensureDbSchema();
    const stored = await getDb()
      .select()
      .from(passports)
      .orderBy(desc(passports.createdAt))
      .limit(50);

    const merged = [...stored.map(asPassport), ...seededPassports]
      .map((passport) => ({
        ...passport,
        ...calculateRankMeta(passport.benchmarkScore, passport.witnessLevel),
      }))
      .filter(
        (passport, index, all) =>
          all.findIndex((candidate) => candidate.nickname === passport.nickname) === index,
      )
      .sort((a, b) => b.eloRating - a.eloRating || b.benchmarkScore - a.benchmarkScore);

    return Response.json({ passports: merged, protocolVersion: PROTOCOL_VERSION });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : messages.loadError },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const messages = messagesFor(request);
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (payload.protocolVersion !== PROTOCOL_VERSION) {
      return Response.json(
        { error: messages.protocol },
        { status: 400 },
      );
    }

    const candidate =
      payload.candidate && typeof payload.candidate === "object"
        ? (payload.candidate as Record<string, unknown>)
        : {};
    const witness =
      payload.codexWitness && typeof payload.codexWitness === "object"
        ? (payload.codexWitness as Record<string, unknown>)
        : {};
    const nickname = cleanText(candidate.nickname, 24).toLowerCase();
    const primaryDomainBase = cleanText(payload.primaryDomain, 60);
    const primaryDomainKo = cleanText(payload.primaryDomainKo, 60) || primaryDomainBase;
    const primaryDomainEn = cleanText(payload.primaryDomainEn, 60) || primaryDomainBase;
    const primaryDomain = primaryDomainEn || primaryDomainKo;
    const summaryBase = cleanText(witness.summary, 420);
    const summaryKo = cleanText(witness.summaryKo, 420) || summaryBase;
    const summaryEn = cleanText(witness.summaryEn, 420) || summaryBase;
    const summary = summaryEn || summaryKo;
    const scores = parseScores(payload.scores);

    if (!/^[a-z0-9_]{3,24}$/.test(nickname)) {
      return Response.json(
        { error: messages.nickname },
        { status: 400 },
      );
    }
    if (primaryDomain.length < 2 || summary.length < 30 || !scores) {
      return Response.json(
        { error: messages.fields },
        { status: 400 },
      );
    }

    const subfields = Array.isArray(payload.subfields)
      ? payload.subfields.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 4)
      : [];
    const subfieldsKo = Array.isArray(payload.subfieldsKo)
      ? payload.subfieldsKo.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 4)
      : subfields;
    const subfieldsEn = Array.isArray(payload.subfieldsEn)
      ? payload.subfieldsEn.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 4)
      : subfields;
    const evidenceHashes = Array.isArray(payload.evidenceHashes)
      ? payload.evidenceHashes
          .map((item) => {
            if (!item || typeof item !== "object") return "";
            return cleanText((item as Record<string, unknown>).hash, 90).toLowerCase();
          })
          .filter((hash) => /^sha256:[a-f0-9]{8,64}$/.test(hash))
          .slice(0, 50)
      : [];
    const scope =
      payload.evidenceScope && typeof payload.evidenceScope === "object"
        ? (payload.evidenceScope as Record<string, unknown>)
        : {};
    const filesIndexed = Number.isInteger(scope.filesIndexed)
      ? Math.max(0, Math.min(scope.filesIndexed as number, 100000))
      : 0;
    const codexSessionsIndexed = Number.isInteger(scope.codexSessionsIndexed)
      ? Math.max(0, Math.min(scope.codexSessionsIndexed as number, 100000))
      : 0;
    const evidenceCount = Math.max(codexSessionsIndexed, filesIndexed, evidenceHashes.length);
    const confidence = Math.min(
      0.95,
      0.55 +
        Math.min(0.2, evidenceHashes.length * 0.02) +
        Math.min(0.2, codexSessionsIndexed / 500) +
        Math.min(0.05, filesIndexed / 2000),
    );
    const evidenceRoot = await hashEvidence(evidenceHashes);
    const witnessLevel = evidenceHashes.length ? "W2" : "W1";
    const benchmarkScore = calculateBenchmarkScore(scores);
    const rankMeta = calculateRankMeta(benchmarkScore, witnessLevel);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    await ensureDbSchema();
    const d1 = getD1();
    await d1
      .prepare(
        `INSERT INTO passports (
          id, nickname, country, timezone, contact_opt_in, primary_domain,
          subfields_json, summary, scores_json, witness_level, benchmark_score,
          confidence, evidence_count, evidence_root, protocol_version, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(nickname) DO UPDATE SET
          id = excluded.id,
          country = excluded.country,
          timezone = excluded.timezone,
          contact_opt_in = excluded.contact_opt_in,
          primary_domain = excluded.primary_domain,
          subfields_json = excluded.subfields_json,
          summary = excluded.summary,
          scores_json = excluded.scores_json,
          witness_level = excluded.witness_level,
          benchmark_score = excluded.benchmark_score,
          confidence = excluded.confidence,
          evidence_count = excluded.evidence_count,
          evidence_root = excluded.evidence_root,
          protocol_version = excluded.protocol_version,
          created_at = excluded.created_at`,
      )
      .bind(
        id,
        nickname,
        cleanText(candidate.country, 4).toUpperCase(),
        cleanText(candidate.timezone, 50),
        candidate.contactOptIn === true ? 1 : 0,
        JSON.stringify({ ko: primaryDomainKo || primaryDomainEn, en: primaryDomainEn || primaryDomainKo }),
        JSON.stringify({ ko: subfieldsKo.length ? subfieldsKo : subfieldsEn, en: subfieldsEn.length ? subfieldsEn : subfieldsKo }),
        JSON.stringify({ ko: summaryKo || summaryEn, en: summaryEn || summaryKo }),
        JSON.stringify(scores),
        witnessLevel,
        benchmarkScore,
        confidence,
        evidenceCount,
        evidenceRoot,
        PROTOCOL_VERSION,
        now,
      )
      .run();

    const passport: PassportRecord = {
      id,
      nickname,
      country: cleanText(candidate.country, 4).toUpperCase(),
      timezone: cleanText(candidate.timezone, 50),
      contactOptIn: candidate.contactOptIn === true,
      primaryDomain,
      primaryDomainKo: primaryDomainKo || primaryDomainEn,
      primaryDomainEn: primaryDomainEn || primaryDomainKo,
      subfields: subfieldsEn.length ? subfieldsEn : subfieldsKo,
      subfieldsKo: subfieldsKo.length ? subfieldsKo : subfieldsEn,
      subfieldsEn: subfieldsEn.length ? subfieldsEn : subfieldsKo,
      summary,
      summaryKo: summaryKo || summaryEn,
      summaryEn: summaryEn || summaryKo,
      scores,
      witnessLevel,
      benchmarkScore,
      ...rankMeta,
      confidence,
      evidenceCount,
      evidenceRoot,
      protocolVersion: PROTOCOL_VERSION,
      createdAt: now,
    };

    return Response.json({ passport }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : messages.submitError },
      { status: 500 },
    );
  }
}
