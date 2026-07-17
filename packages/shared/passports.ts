import { evidenceLabel, isOfficialPassport } from "../protocol/runtime.mjs";

function parseJson(value: unknown, fallback: unknown) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value ?? fallback;
  } catch {
    return fallback;
  }
}

export function serializePassportRow(row: Record<string, unknown>) {
  const passport = {
    id: String(row.id),
    handle: String(row.handle),
    nickname: String(row.displayName ?? row.handle),
    displayName: String(row.displayName ?? row.handle),
    country: String(row.country ?? ""),
    timezone: String(row.timezone ?? ""),
    category: String(row.category),
    assessedCategory: String(row.assessedCategory ?? row.category),
    subfields: parseJson(row.subfieldsJson, []),
    summary: parseJson(row.summaryJson, { ko: "", en: "" }),
    strengths: parseJson(row.strengthsJson, { ko: [], en: [] }),
    weaknesses: parseJson(row.weaknessesJson, { ko: [], en: [] }),
    rawScores: parseJson(row.rawScoresJson, {}),
    calibratedScores: parseJson(row.calibratedScoresJson, {}),
    ovr: Number(row.ovr),
    hvRating: Number(row.hvRating),
    tier: String(row.tier),
    tierDivision: row.tierDivision ? String(row.tierDivision) : null,
    reliabilityScore: Number(row.effectiveReliability ?? row.reliabilityScore),
    baseReliabilityScore: Number(row.reliabilityScore),
    evidenceLevel: String(row.evidenceLevel),
    evidenceLabel: evidenceLabel(String(row.evidenceLevel)),
    evaluator: parseJson(row.evaluatorJson, {}),
    limitations: parseJson(row.limitationsJson, []),
    protocolVersion: String(row.protocolVersion),
    isDemo: Boolean(row.isDemo),
    status: String(row.status),
    publishedAt: row.publishedAt ? String(row.publishedAt) : null,
    revokedAt: row.revokedAt ? String(row.revokedAt) : null,
    createdAt: String(row.createdAt),
    profileIsPublic: Boolean(row.profileIsPublic),
  };
  return { ...passport, official: isOfficialPassport(passport) };
}

export const passportSelectSql = `
  SELECT pv.id, pv.profile_id AS profileId, pv.assessment_id AS assessmentId,
    pv.status, COALESCE(NULLIF(p.preferred_category, ''), pv.category) AS category,
    pv.category AS assessedCategory, pv.subfields_json AS subfieldsJson, pv.summary_json AS summaryJson,
    pv.strengths_json AS strengthsJson, pv.weaknesses_json AS weaknessesJson,
    pv.raw_scores_json AS rawScoresJson, pv.calibrated_scores_json AS calibratedScoresJson,
    pv.ovr, pv.hv_rating AS hvRating, pv.tier, pv.tier_division AS tierDivision,
    pv.reliability_score AS reliabilityScore,
    MAX(40, pv.reliability_score - (CAST(MAX(0, julianday('now') - julianday(COALESCE(pv.published_at, pv.created_at))) / 90 AS INTEGER) * 5)) AS effectiveReliability,
    pv.evidence_level AS evidenceLevel,
    pv.evaluator_json AS evaluatorJson, pv.limitations_json AS limitationsJson,
    pv.protocol_version AS protocolVersion, pv.is_demo AS isDemo,
    pv.published_at AS publishedAt, pv.revoked_at AS revokedAt, pv.created_at AS createdAt,
    p.handle, p.display_name AS displayName, p.country, p.timezone, p.is_public AS profileIsPublic
  FROM passport_versions pv
  JOIN profiles p ON p.id = pv.profile_id`;
