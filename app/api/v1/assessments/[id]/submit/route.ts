
import { getD1 } from "../../../../../../db";
import {
  CATEGORIES, METRIC_KEYS, PROTOCOL_VERSION,
  buildSkillOnlyPublicProfile,
  calculateCalibratedOvr, calculateHvRating, calculateReliability, calculateTier,
  evidenceLevelFor, skillOnlyMetricLimitation, skillOnlyMetricRationale, validateMetricReports,
} from "../../../../../../packages/protocol/runtime.mjs";
import {
  ApiError, assertAssessmentActive, auditEvent, canonicalJson, cleanList, cleanText,
  enforceRateLimit, errorResponse, findSensitivePattern, jsonResponse, nowIso, randomId,
  readJson, requireAssessmentAccess, sha256, verifyMerkleProof,
} from "../../../../../../packages/shared/server";
import { refreshLeagueRatings } from "../../../../../../packages/shared/ratings";

export const dynamic = "force-dynamic";

const SUBMISSION_FIELDS = new Set([
  "protocolVersion", "nonce", "historyRoot", "category", "subfields",
  "summary", "strengths", "weaknesses", "metrics", "sampleProofs",
  "evaluator", "limitations",
]);

type MetricReport = {
  metric: string;
  score: number;
  confidence: number;
  rationale: string;
  supportingEvidenceRefs: string[];
  counterEvidenceRefs?: string[];
  limitation?: string;
};

function localized(value: unknown, maxLength: number, minLength: number) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ko = cleanText(source.ko, maxLength, minLength);
  const en = cleanText(source.en, maxLength, minLength);
  if (!ko || !en) throw new ApiError(400, "LOCALIZED_TEXT_REQUIRED", "Korean and English public text are required.");
  return { ko, en };
}

function localizedList(value: unknown, minItems = 1, maxItems = 4) {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ko = cleanList(source.ko, maxItems, 180);
  const en = cleanList(source.en, maxItems, 180);
  if (ko.length < minItems || en.length < minItems) throw new ApiError(400, "LOCALIZED_LIST_REQUIRED", "Korean and English strengths and gaps are required.");
  return { ko, en };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireAssessmentAccess(request, id);
    await enforceRateLimit(request, "assessment:submit", 8, 3600, access.userId);
    assertAssessmentActive(access.assessment);
    if (access.assessment.status !== "CHALLENGED" && access.assessment.status !== "ASSESSED") {
      throw new ApiError(409, "INVALID_ASSESSMENT_STATE", "Only a challenged assessment can be submitted.");
    }

    const payload = await readJson(request, 512 * 1024);
    const unsupported = Object.keys(payload).find((field) => !SUBMISSION_FIELDS.has(field));
    if (unsupported) throw new ApiError(400, "SUBMISSION_FIELD_UNSUPPORTED", `${unsupported} is not part of the v1 Passport submission schema.`);
    if (payload.protocolVersion !== PROTOCOL_VERSION) throw new ApiError(400, "PROTOCOL_MISMATCH", `protocolVersion must be ${PROTOCOL_VERSION}.`);

    const nonce = cleanText(payload.nonce, 200);
    if (!nonce || await sha256(nonce) !== access.assessment.nonceHash) throw new ApiError(403, "NONCE_INVALID", "The challenge nonce is invalid.");
    const historyRoot = cleanText(payload.historyRoot, 80).toLowerCase();
    const commitment = await getD1().prepare(
      `SELECT history_root AS historyRoot, session_count AS sessionCount, record_count AS recordCount,
       active_days AS activeDays, date_from AS dateFrom, date_to AS dateTo
       FROM evidence_commitments WHERE assessment_id = ? LIMIT 1`,
    ).bind(id).first<Record<string, unknown>>();
    if (!commitment || historyRoot !== commitment.historyRoot) throw new ApiError(409, "COMMITMENT_MISMATCH", "The submitted history root does not match the commitment.");

    const category = cleanText(payload.category, 30);
    if (!CATEGORIES.some((candidate) => candidate.key === category)) throw new ApiError(400, "INVALID_CATEGORY", "The category is not supported.");
    const submittedSummary = localized(payload.summary, 800, 30);
    const submittedStrengths = localizedList(payload.strengths);
    const submittedWeaknesses = localizedList(payload.weaknesses);
    const submittedSubfields = cleanList(payload.subfields, 4, 60);
    const submittedLimitations = cleanList(payload.limitations, 8, 240);
    if (!submittedLimitations.length) throw new ApiError(400, "LIMITATIONS_REQUIRED", "At least one assessment limitation is required.");
    const submittedPublicText = { summary: submittedSummary, strengths: submittedStrengths, weaknesses: submittedWeaknesses, subfields: submittedSubfields, limitations: submittedLimitations };
    const submittedSensitive = findSensitivePattern(submittedPublicText);
    if (submittedSensitive) throw new ApiError(422, "PUBLIC_TEXT_SENSITIVE", "Public Passport text appears to contain personal data or credentials.", { pattern: submittedSensitive });

    const metrics = Array.isArray(payload.metrics) ? payload.metrics as MetricReport[] : [];
    const metricValidation = validateMetricReports(metrics);
    if (!metricValidation.ok) throw new ApiError(400, String(metricValidation.code), "The ten metric reports are incomplete or invalid.");
    for (const metric of metrics) {
      metric.supportingEvidenceRefs = cleanList(metric.supportingEvidenceRefs, 12, 100);
      metric.counterEvidenceRefs = cleanList(metric.counterEvidenceRefs, 12, 100);
      metric.rationale = skillOnlyMetricRationale(metric.metric, metric.score);
      metric.limitation = skillOnlyMetricLimitation();
    }
    const rawScores = Object.fromEntries(metrics.map((metric) => [metric.metric, Math.round(metric.score * 10) / 10]));
    if (!METRIC_KEYS.every((key) => typeof rawScores[key] === "number")) throw new ApiError(400, "METRIC_MISSING", "All ten metrics are required.");
    const { summary, strengths, weaknesses, subfields, limitations } = buildSkillOnlyPublicProfile(rawScores);
    const publicText = { summary, strengths, weaknesses, subfields, limitations };
    const sensitive = findSensitivePattern(publicText);
    if (sensitive) throw new ApiError(422, "PUBLIC_TEXT_SENSITIVE", "Generated public Passport text appears to contain personal data or credentials.", { pattern: sensitive });

    const evaluatorInput = payload.evaluator && typeof payload.evaluator === "object" ? payload.evaluator as Record<string, unknown> : {};
    const evaluator = {
      surface: cleanText(evaluatorInput.surface, 40, 3),
      model: cleanText(evaluatorInput.model, 80, 2),
      codexVersion: cleanText(evaluatorInput.codexVersion, 60, 1),
      agentVersion: cleanText(evaluatorInput.agentVersion || evaluatorInput.claudeVersion || evaluatorInput.codexVersion, 100, 1),
      calibrationVersion: cleanText(evaluatorInput.calibrationVersion, 60, 1),
      anchorResults: evaluatorInput.anchorResults && typeof evaluatorInput.anchorResults === "object" ? evaluatorInput.anchorResults : {},
      tools: cleanList(evaluatorInput.tools, 4, 30),
    };
    if (!evaluator.surface || !evaluator.model || !evaluator.agentVersion) throw new ApiError(400, "EVALUATOR_METADATA_REQUIRED", "AI evaluator metadata is required.");

    const sampleProofInputs = Array.isArray(payload.sampleProofs) ? payload.sampleProofs.slice(0, 24) : [];
    const validProofs: Array<Record<string, unknown>> = [];
    for (const input of sampleProofInputs) {
      if (!input || typeof input !== "object") continue;
      const proof = input as Record<string, unknown>;
      if (await verifyMerkleProof(proof, historyRoot)) validProofs.push(proof);
    }
    const sampleProofVerified = validProofs.length >= Math.min(3, Number(commitment.sessionCount));
    const previousCount = await getD1().prepare(
      "SELECT COUNT(*) AS count, MIN(created_at) AS firstAt FROM passport_versions WHERE profile_id = ? AND revoked_at IS NULL",
    ).bind(access.assessment.profileId).first<{ count: number; firstAt: string | null }>();
    const longitudinal = (previousCount?.count ?? 0) >= 2
      && Boolean(previousCount?.firstAt)
      && Date.now() - Date.parse(previousCount!.firstAt!) >= 60 * 86400000;
    const verified = {
      ownership: true,
      commitment: true,
      challenge: true,
      activeDays: Number(commitment.activeDays),
      dateRangeDays: Math.max(1, Math.ceil((Date.parse(String(commitment.dateTo)) - Date.parse(String(commitment.dateFrom))) / 86400000)),
      sampleProof: sampleProofVerified,
      manifest: true,
      outcome: false,
      longitudinal,
    };
    const reliabilityScore = calculateReliability(verified);
    const evidenceLevel = evidenceLevelFor(verified);
    const { calibratedScores, ovr } = calculateCalibratedOvr(rawScores);
    const initialHvRating = calculateHvRating(ovr, reliabilityScore, 50);
    const initialTier = calculateTier(initialHvRating);
    const payloadForHash = { ...payload, nonce: "[BOUND]", summary, strengths, weaknesses, subfields, limitations, metrics };
    const payloadHash = `sha256:${await sha256(canonicalJson(payloadForHash))}`;
    const d1 = getD1();
    const replay = await d1.prepare("SELECT id FROM passport_versions WHERE payload_hash = ? LIMIT 1").bind(payloadHash).first();
    if (replay) throw new ApiError(409, "SUBMISSION_REPLAY", "This Passport manifest has already been submitted.");

    const current = await d1.prepare("SELECT current_passport_id AS currentPassportId FROM profiles WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(access.assessment.profileId, access.userId).first<{ currentPassportId: string | null }>();
    if (!current) throw new ApiError(403, "PROFILE_OWNERSHIP_REQUIRED", "The assessment profile is not owned by this account.");
    const passportId = randomId("psp");
    const now = nowIso();
    const statements = [
      d1.prepare(
        `INSERT INTO passport_versions (
          id, profile_id, assessment_id, previous_version_id, status, category, subfields_json,
          summary_json, strengths_json, weaknesses_json, raw_scores_json, calibrated_scores_json,
          ovr, hv_rating, tier, tier_division, reliability_score, evidence_level, evaluator_json,
          limitations_json, payload_hash, protocol_version, is_demo, published_at, created_at
        ) VALUES (?, ?, ?, ?, 'PUBLISHED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      ).bind(
        passportId, access.assessment.profileId, id, current.currentPassportId, category, JSON.stringify(subfields),
        JSON.stringify(summary), JSON.stringify(strengths), JSON.stringify(weaknesses), JSON.stringify(rawScores),
        JSON.stringify(calibratedScores), ovr, initialHvRating, initialTier.tier, initialTier.tierDivision, reliabilityScore, evidenceLevel,
        JSON.stringify(evaluator), JSON.stringify(limitations), payloadHash, PROTOCOL_VERSION, now, now,
      ),
      d1.prepare(
        "UPDATE assessment_sessions SET status = 'PUBLISHED', assessed_at = COALESCE(assessed_at, ?), submitted_at = ?, published_at = ?, updated_at = ? WHERE id = ? AND status IN ('CHALLENGED','ASSESSED')",
      ).bind(now, now, now, now, id),
      d1.prepare(
        "UPDATE profiles SET current_passport_id = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      ).bind(passportId, now, access.assessment.profileId, access.userId),
      ...metrics.map((metric) => d1.prepare(
        `INSERT INTO passport_metric_evidence
         (id, passport_id, metric_key, raw_score, calibrated_score, confidence, rationale, supporting_refs_json, counter_refs_json, limitation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        randomId("pme"), passportId, metric.metric, rawScores[metric.metric], calibratedScores[metric.metric],
        metric.confidence, metric.rationale, JSON.stringify(metric.supportingEvidenceRefs),
        JSON.stringify(metric.counterEvidenceRefs ?? []), metric.limitation ?? "",
      )),
      ...validProofs.map((proof, index) => d1.prepare(
        `INSERT INTO sample_proofs (id, assessment_id, sample_ref, sample_hash, proof_json, visibility, created_at)
         VALUES (?, ?, ?, ?, ?, 'PRIVATE', ?)`,
      ).bind(
        randomId("smp"), id, cleanText(proof.sampleRef, 100) || `sample:${index + 1}`,
        cleanText(proof.sampleHash, 80) || `sha256:${String((proof as { siblings?: unknown[] }).siblings?.length ?? 0).padStart(64, "0")}`,
        JSON.stringify(proof), now,
      )),
    ];
    try {
      await d1.batch(statements);
    } catch (error) {
      if (String(error).toLowerCase().includes("unique")) throw new ApiError(409, "SUBMISSION_REPLAY", "This assessment or manifest has already been submitted.");
      throw error;
    }
    await refreshLeagueRatings({ force: true });
    const finalRating = await d1.prepare("SELECT hv_rating AS hvRating, tier, tier_division AS tierDivision FROM passport_versions WHERE id = ? LIMIT 1")
      .bind(passportId).first<{ hvRating: number; tier: string; tierDivision: string | null }>();
    const hvRating = Number(finalRating?.hvRating ?? initialHvRating);
    const tier = String(finalRating?.tier ?? initialTier.tier);
    const tierDivision = finalRating?.tierDivision ?? initialTier.tierDivision;
    await auditEvent(access.userId, "PASSPORT_PUBLISHED", "passport", passportId, { assessmentId: id, evidenceLevel, protocolVersion: PROTOCOL_VERSION, automatic: true });
    return jsonResponse({
      passport: { id: passportId, status: "PUBLISHED", ovr, hvRating, provisionalTier: tier, tierDivision, reliabilityScore, evidenceLevel, protocolVersion: PROTOCOL_VERSION },
      publishRequired: false,
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
