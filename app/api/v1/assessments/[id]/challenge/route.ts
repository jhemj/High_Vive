import { getD1 } from "../../../../../../db";
import { CHALLENGE_VERSION, canTransition } from "../../../../../../packages/protocol/runtime.mjs";
import {
  ApiError, assertAssessmentActive, auditEvent, enforceRateLimit, errorResponse,
  expiresIso, jsonResponse, nowIso, randomToken, requireAssessmentAccess, sha256,
} from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireAssessmentAccess(request, id);
    await enforceRateLimit(request, "assessment:challenge", 12, 3600, access.userId);
    assertAssessmentActive(access.assessment);
    if (!canTransition(String(access.assessment.status), "CHALLENGED")) {
      throw new ApiError(409, "CHALLENGE_ALREADY_ISSUED", "A challenge can be issued exactly once after commitment.");
    }
    const commitment = await getD1().prepare("SELECT id FROM evidence_commitments WHERE assessment_id = ? LIMIT 1").bind(id).first();
    if (!commitment) throw new ApiError(409, "COMMITMENT_REQUIRED", "Commit evidence before requesting a challenge.");

    const nonce = randomToken("hv_nonce", 32);
    const selectionSeed = randomToken("hv_seed", 24);
    const now = nowIso();
    const challengeExpiresAt = expiresIso(45);
    await getD1().prepare(
      `UPDATE assessment_sessions SET status = 'CHALLENGED', nonce_hash = ?, selection_seed = ?,
       challenge_version = ?, expires_at = ?, challenged_at = ?, updated_at = ?
       WHERE id = ? AND status = 'COMMITTED'`,
    ).bind(await sha256(nonce), selectionSeed, CHALLENGE_VERSION, challengeExpiresAt, now, now, id).run();
    await auditEvent(access.userId, "CHALLENGE_ISSUED", "assessment", id, { challengeVersion: CHALLENGE_VERSION });
    return jsonResponse({ assessmentId: id, nonce, selectionSeed, expiresAt: challengeExpiresAt, challengeVersion: CHALLENGE_VERSION }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
