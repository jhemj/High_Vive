
import { getD1 } from "../../../../../db";
import { passportSelectSql, serializePassportRow } from "../../../../../packages/shared/passports";
import { ApiError, errorResponse, jsonResponse, normalizeHandle } from "../../../../../packages/shared/server";
import { refreshLeagueRatings } from "../../../../../packages/shared/ratings";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  try {
    await refreshLeagueRatings();
    const handle = normalizeHandle((await context.params).handle);
    const profile = await getD1().prepare(
      `SELECT id, handle, display_name AS displayName, bio, country,
       preferred_category AS preferredCategory, timezone,
       languages_json AS languagesJson, links_json AS linksJson, current_passport_id AS currentPassportId,
       created_at AS createdAt, updated_at AS updatedAt
       FROM profiles WHERE handle = ? AND is_public = 1 LIMIT 1`,
    ).bind(handle).first<Record<string, unknown>>();
    if (!profile) throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    const history = await getD1().prepare(
      `${passportSelectSql} WHERE pv.profile_id = ? AND pv.published_at IS NOT NULL
       ORDER BY pv.published_at DESC LIMIT 50`,
    ).bind(profile.id).all<Record<string, unknown>>();
    const passports = (history.results ?? []).map(serializePassportRow);
    return jsonResponse({
      profile: { ...profile, languages: JSON.parse(String(profile.languagesJson ?? "[]")), links: JSON.parse(String(profile.linksJson ?? "[]")) },
      currentPassport: passports.find((passport: { id: string }) => passport.id === profile.currentPassportId) ?? passports[0] ?? null,
      passports,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
