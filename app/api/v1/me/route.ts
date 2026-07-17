import { getD1 } from "../../../../db";
import {
  ApiError, auditEvent, errorResponse, findProfileByUser, jsonResponse, nowIso,
  requireBrowserUser,
} from "../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireBrowserUser(request);
    const profile = await findProfileByUser(user.userId);
    return jsonResponse({ user: { id: user.userId, locale: user.locale }, profile });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireBrowserUser(request);
    const d1 = getD1();
    const now = nowIso();
    const profile = await findProfileByUser(user.userId);
    if (!profile) throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    await d1.batch([
      d1.prepare("UPDATE users SET status = 'DELETED', deleted_at = ?, updated_at = ? WHERE id = ?").bind(now, now, user.userId),
      d1.prepare("UPDATE profiles SET is_public = 0, updated_at = ? WHERE user_id = ?").bind(now, user.userId),
      d1.prepare("UPDATE api_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, user.userId),
      d1.prepare("UPDATE assessment_sessions SET status = 'CANCELLED', updated_at = ? WHERE user_id = ? AND status IN ('DRAFT','COMMITTED','CHALLENGED','ASSESSED')").bind(now, user.userId),
    ]);
    await auditEvent(user.userId, "ACCOUNT_DELETED", "user", user.userId);
    return jsonResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
