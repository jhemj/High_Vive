
export const PROTOCOL_VERSION = "high-vive-witness-v1.0";
export const SCANNER_VERSION = "high-vive-cli-v1.1";
export const CANONICALIZATION_VERSION = "hv-canonical-json-v1";
export const REDACTION_VERSION = "hv-redaction-v1";
export const CALIBRATION_VERSION = "hv-calibration-v1";
export const RATING_VERSION = "hv-rating-v2";
export const CHALLENGE_VERSION = "hv-challenge-v1";

export const METRICS = Object.freeze([
  { key: "contextPackaging", ko: "맥락 설계", en: "Context Packaging", weight: 0.12, midpoint: 74, spread: 11 },
  { key: "aiDelegation", ko: "AI 위임", en: "AI Delegation", weight: 0.11, midpoint: 73, spread: 11 },
  { key: "verificationDiscipline", ko: "검증 규율", en: "Verification Discipline", weight: 0.14, midpoint: 72, spread: 10 },
  { key: "iterationQuality", ko: "반복 개선", en: "Iteration Quality", weight: 0.10, midpoint: 74, spread: 11 },
  { key: "outcomeYield", ko: "결과물 전환율", en: "Outcome Yield", weight: 0.14, midpoint: 72, spread: 10 },
  { key: "toolFluency", ko: "도구 활용", en: "Tool Fluency", weight: 0.10, midpoint: 72, spread: 12 },
  { key: "domainClarity", ko: "도메인 이해도", en: "Domain Understanding", weight: 0.08, midpoint: 74, spread: 11 },
  { key: "communicationQuality", ko: "커뮤니케이션", en: "Communication Quality", weight: 0.07, midpoint: 74, spread: 12 },
  { key: "creativity", ko: "창의적 문제 해결", en: "Creative Problem Solving", weight: 0.08, midpoint: 72, spread: 12 },
  { key: "tokenEfficiency", ko: "토큰 효율", en: "Token Efficiency", weight: 0.06, midpoint: 68, spread: 13 },
]);

export const METRIC_KEYS = Object.freeze(METRICS.map((metric) => metric.key));

const SKILL_COPY = Object.freeze({
  contextPackaging: {
    koStrength: "목표, 제약, 필요한 맥락을 AI가 실행할 수 있는 형태로 정리하는 능력이 두드러집니다.",
    enStrength: "You package goals, constraints, and essential context into instructions an AI can act on.",
    koGap: "목표·제약·완료 기준을 더 일관되게 제시하면 AI 실행의 정확도를 높일 수 있습니다.",
    enGap: "Make goals, constraints, and completion criteria more consistent to improve execution accuracy.",
  },
  aiDelegation: {
    koStrength: "AI에 맡길 범위와 사람이 판단할 지점을 구분하며 작업을 효과적으로 위임합니다.",
    enStrength: "You delegate effectively by separating AI-owned work from decisions that need human judgment.",
    koGap: "위임 범위와 중간 확인 지점을 더 명확히 나누면 협업 흐름이 안정됩니다.",
    enGap: "Clarify delegation boundaries and checkpoints to make the collaboration flow more reliable.",
  },
  verificationDiscipline: {
    koStrength: "결과를 그대로 수용하지 않고 테스트·검증·근거 확인으로 품질을 통제합니다.",
    enStrength: "You control quality through tests, verification, and evidence instead of accepting output at face value.",
    koGap: "완료 전 검증 기준과 실패 확인 절차를 더 꾸준히 적용하는 것이 좋습니다.",
    enGap: "Apply pre-completion checks and failure validation more consistently.",
  },
  iterationQuality: {
    koStrength: "피드백을 다음 지시에 반영하며 결과를 단계적으로 개선하는 반복 능력이 좋습니다.",
    enStrength: "You turn feedback into better follow-up instructions and improve results through focused iterations.",
    koGap: "각 반복에서 바꿀 점과 유지할 점을 분리하면 개선 효율이 높아집니다.",
    enGap: "Separate what should change from what should stay fixed in each iteration.",
  },
  outcomeYield: {
    koStrength: "AI 협업을 실제로 사용할 수 있는 완료 결과까지 연결하는 능력이 안정적입니다.",
    enStrength: "You reliably turn AI collaboration into usable, completed outcomes.",
    koGap: "완료 정의와 마지막 마무리 단계를 더 선명하게 관리하면 결과물 전환율이 높아집니다.",
    enGap: "Define completion and manage finalization more clearly to improve outcome yield.",
  },
  toolFluency: {
    koStrength: "작업에 맞는 도구를 선택하고 AI가 도구를 활용하도록 지시하는 능력이 좋습니다.",
    enStrength: "You choose appropriate tools and direct the AI to use them effectively.",
    koGap: "도구 선택 이유와 사용 후 확인 절차를 더 구조화하면 활용도가 높아집니다.",
    enGap: "Structure tool-selection reasoning and post-use checks more explicitly.",
  },
  domainClarity: {
    koStrength: "문제의 핵심 규칙과 제약을 이해하고 AI가 판단할 수 있도록 명확히 전달합니다.",
    enStrength: "You understand the problem's governing rules and constraints and make them clear to the AI.",
    koGap: "문제의 핵심 규칙, 예외, 우선순위를 먼저 정리하면 판단 품질이 높아집니다.",
    enGap: "State governing rules, exceptions, and priorities earlier to improve decision quality.",
  },
  communicationQuality: {
    koStrength: "요구사항과 피드백을 구체적으로 전달해 AI와의 의사소통 손실을 줄입니다.",
    enStrength: "You communicate requirements and feedback precisely, reducing information loss with the AI.",
    koGap: "모호한 표현을 줄이고 기대 결과를 관찰 가능한 기준으로 바꾸는 연습이 필요합니다.",
    enGap: "Reduce ambiguity by turning expected results into observable criteria.",
  },
  creativity: {
    koStrength: "막힌 상황에서 대안을 탐색하고 새로운 해결 경로를 제시하는 능력이 좋습니다.",
    enStrength: "You explore alternatives and open new solution paths when the initial approach stalls.",
    koGap: "첫 접근이 막힐 때 비교 가능한 대안을 더 적극적으로 요청하면 해결 폭이 넓어집니다.",
    enGap: "Request comparable alternatives more actively when the first approach stalls.",
  },
  tokenEfficiency: {
    koStrength: "필요한 정보를 압축해 전달하며 불필요한 왕복과 반복을 줄입니다.",
    enStrength: "You compress essential information and reduce unnecessary back-and-forth.",
    koGap: "중복 설명을 줄이고 핵심 맥락·요청·완료 기준 중심으로 지시를 압축하는 것이 좋습니다.",
    enGap: "Reduce repetition and compress instructions around context, request, and completion criteria.",
  },
});

const SKILL_ONLY_LIMITATION_COPY = Object.freeze([
  "이 진단은 관찰된 AI 협업 행동만 반영하며 프로젝트 주제·이름·업종·기술 스택·기능 내용은 점수와 서술에서 제외합니다. / This diagnosis reflects only observed AI-collaboration behavior; project topics, names, industries, stacks, and features are excluded.",
  "기록에 나타나지 않은 오프라인 설계·코딩 능력과 실제 사업 성과는 평가하지 않습니다. / Skills not visible in the recorded AI collaboration and real-world business outcomes are not assessed.",
]);

function boundedScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score * 10) / 10)) : 0;
}

function skillRanking(rawScores) {
  const source = rawScores && typeof rawScores === "object" ? rawScores : {};
  return METRICS.map((metric, index) => ({ ...metric, index, score: boundedScore(source[metric.key]) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

export function buildSkillOnlyNarrative(rawScores) {
  const ranked = skillRanking(rawScores);
  const strengths = ranked.slice(0, 3);
  const gaps = [...ranked].sort((a, b) => a.score - b.score || a.index - b.index).slice(0, 3);
  const [first, second] = strengths;
  const [priority] = gaps;
  return {
    summary: {
      ko: `평가된 AI 협업 기록에서는 ${first.ko}, ${second.ko} 역량이 상대적으로 가장 안정적으로 관찰되었습니다. 다음 성장 우선순위는 ${priority.ko}입니다. 이 진단은 프로젝트 내용이 아닌 바이브코딩 행동 패턴만 반영합니다.`,
      en: `Across the assessed AI-collaboration history, ${first.en} and ${second.en} were the most consistently observed capabilities. The next growth priority is ${priority.en}. This diagnosis reflects vibe-coding behavior only, never project content.`,
    },
    strengths: {
      ko: strengths.map((metric) => SKILL_COPY[metric.key].koStrength),
      en: strengths.map((metric) => SKILL_COPY[metric.key].enStrength),
    },
    weaknesses: {
      ko: gaps.map((metric) => SKILL_COPY[metric.key].koGap),
      en: gaps.map((metric) => SKILL_COPY[metric.key].enGap),
    },
  };
}

export function buildSkillOnlyPublicProfile(rawScores) {
  return {
    ...buildSkillOnlyNarrative(rawScores),
    subfields: [],
    limitations: [...SKILL_ONLY_LIMITATION_COPY],
  };
}

function observationLevel(score) {
  if (score >= 90) return { ko: "예외적으로 일관된", en: "exceptionally consistent" };
  if (score >= 75) return { ko: "체계적인", en: "systematic" };
  if (score >= 60) return { ko: "반복 가능한", en: "repeatable" };
  if (score >= 40) return { ko: "일관성이 더 필요한", en: "inconsistent" };
  return { ko: "아직 충분히 관찰되지 않은", en: "not yet sufficiently observed" };
}

export function skillOnlyMetricRationale(metricKey, score) {
  const metric = METRICS.find((candidate) => candidate.key === metricKey) ?? METRICS[0];
  const bounded = boundedScore(score);
  const level = observationLevel(bounded);
  return `${metric.ko} ${bounded}점: 평가 기록에서 이 바이브코딩 행동이 ${level.ko} 수준으로 관찰되었습니다. 프로젝트 내용은 판단과 설명에서 제외했습니다. / ${metric.en} ${bounded}: this vibe-coding behavior was observed at a ${level.en} level. Project content was excluded from both judgment and explanation.`;
}

export function skillOnlyMetricLimitation() {
  return "프로젝트 내용이 아닌 관찰 가능한 AI 협업 행동만 반영합니다. / Reflects observable AI-collaboration behavior only, not project content.";
}

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
  { key: "other", ko: "기타", en: "Other" },
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

export function calculateHvRating(ovr, reliability, relativePosition = 50) {
  const skill = Math.max(0, Math.min(100, Number(ovr) || 0));
  const trust = Math.max(0, Math.min(100, Number(reliability) || 0));
  const relative = Math.max(0, Math.min(100, Number(relativePosition) || 0));
  return Math.max(0, Math.min(1000, Math.round((skill * 0.70 + trust * 0.15 + relative * 0.15) * 10)));
}

export function calculateEffectiveReliability(reliability, publishedAt, now = Date.now()) {
  const base = Math.max(0, Math.min(100, Number(reliability) || 0));
  const timestamp = Date.parse(String(publishedAt || ""));
  if (!Number.isFinite(timestamp)) return base;
  const ageDays = Math.max(0, (Number(now) - timestamp) / 86400000);
  const decay = Math.floor(ageDays / 90) * 5;
  return round1(Math.max(40, base - decay));
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
    ratingVersion: RATING_VERSION,
    challengeVersion: CHALLENGE_VERSION,
    metrics: METRICS,
    categories: CATEGORIES,
    tierBands: TIER_BANDS,
    evidenceLevels: EVIDENCE_LEVELS,
    serverLlmCalls: 0,
  };
}
