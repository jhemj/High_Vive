import { getD1 } from "../../../../../../db";
import { passportSelectSql, serializePassportRow } from "../../../../../../packages/shared/passports";
import { ApiError, errorResponse, jsonResponse, normalizeHandle } from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  try {
    const handle = normalizeHandle((await context.params).handle);
    const profile = await getD1().prepare("SELECT id FROM profiles WHERE handle = ? AND is_public = 1 LIMIT 1").bind(handle).first<{ id: string }>();
    if (!profile) throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    const result = await getD1().prepare(
      `${passportSelectSql} WHERE pv.profile_id = ? AND pv.published_at IS NOT NULL ORDER BY pv.published_at DESC LIMIT 50`,
    ).bind(profile.id).all<Record<string, unknown>>();
    return jsonResponse({ passports: (result.results ?? []).map(serializePassportRow) });
  } catch (error) {
    return errorResponse(error);
  }
}
