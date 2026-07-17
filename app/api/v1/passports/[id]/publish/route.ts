import { getD1 } from "../../../../../../db";
import {
  ApiError, auditEvent, enforceRateLimit, errorResponse, jsonResponse, nowIso,
  requireBrowserUser,
} from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await requireBrowserUser(request);
    await enforceRateLimit(request, "passport:publish", 20, 3600, user.userId);
    const d1 = getD1();
    const row = await d1.prepare(
      `SELECT pv.id, pv.status, pv.profile_id AS profileId, pv.assessment_id AS assessmentId,
       p.user_id AS userId, p.is_public AS profileIsPublic
       FROM passport_versions pv JOIN profiles p ON p.id = pv.profile_id WHERE pv.id = ? LIMIT 1`,
    ).bind(id).first<Record<string, unknown>>();
    if (!row) throw new ApiError(404, "PASSPORT_NOT_FOUND", "Passport not found.");
    if (row.userId !== user.userId) throw new ApiError(403, "PASSPORT_FORBIDDEN", "This Passport belongs to another account.");
    if (row.status !== "SUBMITTED") throw new ApiError(409, "PASSPORT_NOT_PUBLISHABLE", "Only a submitted Passport can be published.");
    if (!row.profileIsPublic) throw new ApiError(409, "PROFILE_PRIVATE", "Make the profile public before publishing.");
    const now = nowIso();
    await d1.batch([
      d1.prepare("UPDATE passport_versions SET status = 'PUBLISHED', published_at = ? WHERE id = ? AND status = 'SUBMITTED'").bind(now, id),
      d1.prepare("UPDATE profiles SET current_passport_id = ?, updated_at = ? WHERE id = ? AND user_id = ?").bind(id, now, row.profileId, user.userId),
      d1.prepare("UPDATE assessment_sessions SET status = 'PUBLISHED', published_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND status = 'SUBMITTED'").bind(now, now, row.assessmentId, user.userId),
    ]);
    await auditEvent(user.userId, "PASSPORT_PUBLISHED", "passport", id, { assessmentId: row.assessmentId });
    return jsonResponse({ passportId: id, status: "PUBLISHED", publishedAt: now });
  } catch (error) {
    return errorResponse(error);
  }
}
