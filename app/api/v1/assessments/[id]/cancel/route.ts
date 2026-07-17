import { getD1 } from "../../../../../../db";
import { canTransition } from "../../../../../../packages/protocol/runtime.mjs";
import {
  ApiError, auditEvent, errorResponse, jsonResponse, nowIso, requireAssessmentAccess,
} from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireAssessmentAccess(request, id);
    if (!canTransition(String(access.assessment.status), "CANCELLED")) {
      throw new ApiError(409, "ASSESSMENT_NOT_CANCELLABLE", "This assessment can no longer be cancelled.");
    }
    const now = nowIso();
    await getD1().prepare(
      "UPDATE assessment_sessions SET status = 'CANCELLED', updated_at = ? WHERE id = ? AND user_id = ?",
    ).bind(now, id, access.userId).run();
    await auditEvent(access.userId, "ASSESSMENT_CANCELLED", "assessment", id);
    return jsonResponse({ assessmentId: id, status: "CANCELLED" });
  } catch (error) {
    return errorResponse(error);
  }
}
