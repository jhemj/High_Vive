import { getD1 } from "../../../../../db";
import { errorResponse, jsonResponse, requireAssessmentAccess } from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireAssessmentAccess(request, id);
    const commitment = await getD1().prepare(
      `SELECT history_root AS historyRoot, session_count AS sessionCount, record_count AS recordCount,
       active_days AS activeDays, date_from AS dateFrom, date_to AS dateTo, created_at AS createdAt
       FROM evidence_commitments WHERE assessment_id = ? LIMIT 1`,
    ).bind(id).first();
    const passport = await getD1().prepare(
      `SELECT id, status, evidence_level AS evidenceLevel, reliability_score AS reliabilityScore,
       hv_rating AS hvRating, ovr, published_at AS publishedAt, revoked_at AS revokedAt
       FROM passport_versions WHERE assessment_id = ? LIMIT 1`,
    ).bind(id).first();
    const assessment = { ...access.assessment };
    delete assessment.uploadTokenHash;
    delete assessment.nonceHash;
    delete assessment.selectionSeed;
    return jsonResponse({ assessment, commitment, passport });
  } catch (error) {
    return errorResponse(error);
  }
}
