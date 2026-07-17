import { getD1 } from "../../../../db";
import {
  ApiError, auditEvent, countryFromRequest, errorResponse, findProfileByUser, jsonResponse, nowIso,
  requireBrowserUser,
} from "../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireBrowserUser(request);
    let profile = await findProfileByUser(user.userId);
    const d1 = getD1();
    const suggestedCountry = countryFromRequest(request);
    if (profile && !profile.country && suggestedCountry) {
      await d1.prepare("UPDATE profiles SET country = ?, updated_at = ? WHERE id = ? AND (country IS NULL OR country = '')")
        .bind(suggestedCountry, nowIso(), profile.id).run();
      profile = { ...profile, country: suggestedCountry };
      await auditEvent(user.userId, "PROFILE_COUNTRY_SUGGESTED", "profile", String(profile.id), { country: suggestedCountry });
    }
    const assessment = await d1.prepare(
      `SELECT id, status, protocol_version AS protocolVersion, scanner_version AS scannerVersion,
       expires_at AS expiresAt, created_at AS createdAt, updated_at AS updatedAt
       FROM assessment_sessions WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 1`,
    ).bind(user.userId).first<{ id: string; status: string }>();
    const [commitment, passport] = assessment ? await Promise.all([
      d1.prepare(
        `SELECT history_root AS historyRoot, session_count AS sessionCount, record_count AS recordCount,
         active_days AS activeDays, date_from AS dateFrom, date_to AS dateTo, created_at AS createdAt
         FROM evidence_commitments WHERE assessment_id = ? LIMIT 1`,
      ).bind(assessment.id).first(),
      d1.prepare(
        `SELECT id, status, evidence_level AS evidenceLevel, reliability_score AS reliabilityScore,
         hv_rating AS hvRating, ovr, published_at AS publishedAt, revoked_at AS revokedAt
         FROM passport_versions WHERE assessment_id = ? LIMIT 1`,
      ).bind(assessment.id).first(),
    ]) : [null, null];
    return jsonResponse({
      user: { id: user.userId, locale: user.locale, provider: user.provider ?? "token", displayName: profile?.displayName ?? "High-Vive player" },
      profile,
      suggestedCountry,
      latestAssessment: assessment ? { assessment, commitment, passport } : null,
    });
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
      d1.prepare("UPDATE browser_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, user.userId),
      d1.prepare("UPDATE assessment_sessions SET status = 'CANCELLED', updated_at = ? WHERE user_id = ? AND status IN ('DRAFT','COMMITTED','CHALLENGED','ASSESSED')").bind(now, user.userId),
    ]);
    await auditEvent(user.userId, "ACCOUNT_DELETED", "user", user.userId);
    return jsonResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
