import { getD1 } from "../../../../../../db";
import {
  ApiError, auditEvent, enforceRateLimit, errorResponse, jsonResponse, nowIso,
  readJson, requireBrowserUser,
} from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await requireBrowserUser(request);
    await enforceRateLimit(request, "passport:revoke", 10, 3600, user.userId);
    const payload = await readJson(request, 8 * 1024);
    const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 200) : "user_requested";
    const d1 = getD1();
    const row = await d1.prepare(
      `SELECT pv.profile_id AS profileId, pv.assessment_id AS assessmentId, pv.status,
       p.user_id AS userId, p.current_passport_id AS currentPassportId
       FROM passport_versions pv JOIN profiles p ON p.id = pv.profile_id WHERE pv.id = ? LIMIT 1`,
    ).bind(id).first<Record<string, unknown>>();
    if (!row) throw new ApiError(404, "PASSPORT_NOT_FOUND", "Passport not found.");
    if (row.userId !== user.userId) throw new ApiError(403, "PASSPORT_FORBIDDEN", "This Passport belongs to another account.");
    if (row.status === "REVOKED") throw new ApiError(409, "PASSPORT_ALREADY_REVOKED", "The Passport is already revoked.");
    const now = nowIso();
    await d1.prepare("UPDATE passport_versions SET status = 'REVOKED', revoked_at = ? WHERE id = ?").bind(now, id).run();
    if (row.assessmentId) {
      await d1.prepare("UPDATE assessment_sessions SET status = 'REVOKED', updated_at = ? WHERE id = ?").bind(now, row.assessmentId).run();
    }
    if (row.currentPassportId === id) {
      const previous = await d1.prepare(
        `SELECT id FROM passport_versions WHERE profile_id = ? AND id <> ? AND published_at IS NOT NULL AND revoked_at IS NULL
         ORDER BY published_at DESC LIMIT 1`,
      ).bind(row.profileId, id).first<{ id: string }>();
      await d1.prepare("UPDATE profiles SET current_passport_id = ?, updated_at = ? WHERE id = ? AND user_id = ?")
        .bind(previous?.id ?? null, now, row.profileId, user.userId).run();
    }
    await auditEvent(user.userId, "PASSPORT_REVOKED", "passport", id, { reason });
    return jsonResponse({ passportId: id, status: "REVOKED", revokedAt: now });
  } catch (error) {
    return errorResponse(error);
  }
}
