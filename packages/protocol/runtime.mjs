export const PROTOCOL_VERSION = "high-vive-witness-v1.0";
export const SCANNER_VERSION = "high-vive-cli-v1.1";
export const CANONICALIZATION_VERSION = "hv-canonical-json-v1";
export const REDACTION_VERSION = "hv-redaction-v1";
export const CALIBRATION_VERSION = "hv-calibration-v1";
export const CHALLENGE_VERSION = "hv-challenge-v1";

export const METRICS = Object.freeze([
  { key: "contextPackaging", ko: "맥락 설계", en: "Context Packaging", weight: 0.12, midpoint: 74, spread: 11 },
  { key: "aiDelegation", ko: "AI 위임", en: "AI Delegation", weight: 0.11, midpoint: 73, spread: 11 },
  { key: "verificationDiscipline", ko: "검증 규율", en: "Verification Discipline", weight: 0.14, midpoint: 72, spread: 10 },
  { key: "iterationQuality", ko: "반복 개선", en: "Iteration Quality", weight: 0.10, midpoint: 74, spread: 11 },
  { key: "outcomeYield", ko: "결과물 전환율", en: "Outcome Yield", weight: 0.14, midpoint: 72, spread: 10 },
  { key: "toolFluency", ko: "도구 활용", en: "Tool Fluency", weight: 0.10, midpoint: 72, spread: 12 },
  { key: "domainClarity", ko: "분야 명확성", en: "Domain Clarity", weight: 0.08, midpoint: 74, spread: 11 },
  { key: "communicationQuality", ko: "커뮤니케이션", en: "Communication Quality", weight: 0.07, midpoint: 74, spread: 12 },
  { key: "creativity", ko: "창의적 문제 해결", en: "Creative Problem Solving", weight: 0.08, midpoint: 72, spread: 12 },
  { key: "tokenEfficiency", ko: "토큰 효율", en: "Token Efficiency", weight: 0.06, midpoint: 68, spread: 13 },
]);

export const METRIC_KEYS = Object.freeze(METRICS.map((metric) => metric.key));

export const CATEGORIES = Object.freeze([
  { key: "frontend", ko: "프론트엔드", en: "Frontend" },
  { key: "backend", ko: "백엔드", en: "Backend" },
  { key: "fullstack", ko: "풀스택", en: "Full-stack" },
  { key: "mobile", ko: "모바일·데스크톱", en: "Mobile & Desktop" },
  { key: "data", ko: "데이터·분석", en: "Data & Analytics" },
  { key: "aiEngineering", ko: "AI·ML 엔지니어링", en: "AI & ML Engineering" },
  { key: "aiOps", ko: "AI OPS·자동화", en: "AI Ops & Automation" },
  { key: "devops", ko: "DevOps·클라우드", en: "DevOps, Cloud & Infra" },
  { key: "security", ko: "보안", en: "Security" },
  { key: "product", ko: "제품·디자인·콘텐츠", en: "Product, Design & Content" },
]);

export const EVIDENCE_LEVELS = Object.freeze([
  { key: "E0", label: "SELF-REPORTED", rank: 0 },
  { key: "E1", label: "LOCAL SCAN", rank: 1 },
  { key: "E2", label: "CHALLENGE-BOUND", rank: 2 },
  { key: "E3", label: "SAMPLE-PROVEN", rank: 3 },
  { key: "E4", label: "OUTCOME-VALIDATED", rank: 4 },
  { key: "E5", label: "LONGITUDINAL", rank: 5 },
]);

export const TIER_BANDS = Object.freeze([
  { name: "Iron", min: 0, max: 199 },
  { name: "Bronze", min: 200, max: 349 },
  { name: "Silver", min: 350, max: 499 },
  { name: "Gold", min: 500, max: 649 },
  { name: "Platinum", min: 650, max: 749 },
  { name: "Emerald", min: 750, max: 819 },
  { name: "Diamond", min: 820, max: 879 },
  { name: "Master", min: 880, max: 929 },
  { name: "Grandmaster", min: 930, max: 969 },
  { name: "Challenger", min: 970, max: 1000 },
]);

export const ASSESSMENT_STATUSES = Object.freeze([
  "DRAFT", "COMMITTED", "CHALLENGED", "ASSESSED", "SUBMITTED", "PUBLISHED",
  "EXPIRED", "FAILED", "REVOKED", "CANCELLED",
]);

const STATUS_TRANSITIONS = Object.freeze({
  DRAFT: ["COMMITTED", "CANCELLED", "FAILED", "EXPIRED"],
  COMMITTED: ["CHALLENGED", "CANCELLED", "FAILED", "EXPIRED"],
  CHALLENGED: ["ASSESSED", "SUBMITTED", "CANCELLED", "FAILED", "EXPIRED"],
  ASSESSED: ["SUBMITTED", "CANCELLED", "FAILED", "EXPIRED"],
  SUBMITTED: ["PUBLISHED", "REVOKED"],
  PUBLISHED: ["REVOKED"],
  EXPIRED: [], FAILED: [], REVOKED: [], CANCELLED: [],
});

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function calibrateScore(score, metric) {
  const bounded = Math.max(0, Math.min(100, Number(score)));
  return round1(100 / (1 + Math.exp(-(bounded - metric.midpoint) / metric.spread)));
}

export function calibrateScores(rawScores) {
  return Object.fromEntries(METRICS.map((metric) => [metric.key, calibrateScore(rawScores[metric.key], metric)]));
}

export function calculateCalibratedOvr(rawScores) {
  const calibratedScores = calibrateScores(rawScores);
  const ovr = round1(METRICS.reduce((total, metric) => total + calibratedScores[metric.key] * metric.weight, 0));
  return { calibratedScores, ovr };
}

export function calculateHvRating(ovr) {
  return Math.max(0, Math.min(1000, Math.round(Number(ovr) * 10)));
}

export function calculateTier(hvRating) {
  const rating = Math.max(0, Math.min(1000, Math.round(Number(hvRating))));
  const band = TIER_BANDS.find((candidate) => rating >= candidate.min && rating <= candidate.max) ?? TIER_BANDS[0];
  if (["Master", "Grandmaster", "Challenger"].includes(band.name)) {
    return { tier: band.name, tierDivision: null };
  }
  const width = band.max - band.min + 1;
  const progress = Math.min(0.999, Math.max(0, (rating - band.min) / width));
  return { tier: band.name, tierDivision: ["IV", "III", "II", "I"][Math.floor(progress * 4)] };
}

export function canTransition(from, to) {
  return Boolean(STATUS_TRANSITIONS[from]?.includes(to));
}

export function calculateReliability(verified) {
  const ownership = verified.ownership ? 10 : 0;
  const commitment = verified.commitment ? 20 : 0;
  const challenge = verified.challenge ? 20 : 0;
  const activeDays = Math.max(0, Number(verified.activeDays) || 0);
  const dateRangeDays = Math.max(0, Number(verified.dateRangeDays) || 0);
  const scope = Math.min(15, Math.round((Math.min(activeDays, 60) / 60 * 8 + Math.min(dateRangeDays, 180) / 180 * 7) * 10) / 10);
  const sampleProof = verified.sampleProof ? 15 : 0;
  const manifest = verified.manifest ? 10 : 0;
  const outcome = verified.outcome ? 10 : 0;
  return round1(ownership + commitment + challenge + scope + sampleProof + manifest + outcome);
}

export function evidenceLevelFor(verified) {
  if (verified.longitudinal) return "E5";
  if (verified.outcome) return "E4";
  if (verified.sampleProof) return "E3";
  if (verified.challenge) return "E2";
  if (verified.commitment) return "E1";
  return "E0";
}

export function evidenceLabel(level) {
  return EVIDENCE_LEVELS.find((candidate) => candidate.key === level)?.label ?? "SELF-REPORTED";
}

export function evidenceRank(level) {
  return EVIDENCE_LEVELS.find((candidate) => candidate.key === level)?.rank ?? 0;
}

export function isOfficialPassport(passport) {
  return evidenceRank(passport.evidenceLevel) >= 2
    && Number(passport.reliabilityScore) >= 60
    && passport.protocolVersion === PROTOCOL_VERSION
    && passport.isDemo !== true
    && !passport.revokedAt
    && passport.profileIsPublic !== false;
}

export function isValidHandle(value) {
  return /^[a-z0-9_]{3,24}$/.test(String(value ?? ""));
}

export function validateRawScores(rawScores) {
  if (!rawScores || typeof rawScores !== "object" || Array.isArray(rawScores)) return false;
  return METRIC_KEYS.every((key) => typeof rawScores[key] === "number" && Number.isFinite(rawScores[key]) && rawScores[key] >= 0 && rawScores[key] <= 100);
}

export function validateMetricReports(metrics) {
  if (!Array.isArray(metrics) || metrics.length !== METRIC_KEYS.length) return { ok: false, code: "METRIC_COUNT" };
  const seen = new Set();
  for (const report of metrics) {
    if (!report || typeof report !== "object" || !METRIC_KEYS.includes(report.metric) || seen.has(report.metric)) return { ok: false, code: "METRIC_KEY" };
    seen.add(report.metric);
    if (typeof report.score !== "number" || !Number.isFinite(report.score) || report.score < 0 || report.score > 100) return { ok: false, code: "METRIC_SCORE" };
    if (typeof report.confidence !== "number" || report.confidence < 0 || report.confidence > 1) return { ok: false, code: "METRIC_CONFIDENCE" };
    if (typeof report.rationale !== "string" || report.rationale.trim().length < 20 || report.rationale.length > 800) return { ok: false, code: "METRIC_RATIONALE" };
    if (!Array.isArray(report.supportingEvidenceRefs) || report.supportingEvidenceRefs.length < 1 || report.supportingEvidenceRefs.length > 12) return { ok: false, code: "METRIC_EVIDENCE" };
    const counters = Array.isArray(report.counterEvidenceRefs) ? report.counterEvidenceRefs : [];
    if (report.score >= 80 && counters.length === 0 && String(report.limitation ?? "").trim().length < 10) return { ok: false, code: "METRIC_COUNTER_EVIDENCE" };
  }
  return { ok: true };
}

export function protocolDescriptor() {
  return {
    protocolVersion: PROTOCOL_VERSION,
    scannerVersion: SCANNER_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    redactionVersion: REDACTION_VERSION,
    calibrationVersion: CALIBRATION_VERSION,
    challengeVersion: CHALLENGE_VERSION,
    metrics: METRICS,
    categories: CATEGORIES,
    tierBands: TIER_BANDS,
    evidenceLevels: EVIDENCE_LEVELS,
    serverLlmCalls: 0,
  };
}
