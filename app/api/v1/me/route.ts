import { getD1 } from "../../../../db";
import {
  ApiError, auditEvent, countryFromRequest, enforceRateLimit, errorResponse, findProfileByUser, jsonResponse, nowIso,
  readJson, requireBrowserUser,
} from "../../../../packages/shared/server";
import { passportSelectSql, serializePassportRow } from "../../../../packages/shared/passports";

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
    const historyResult = profile ? await d1.prepare(
      `${passportSelectSql} WHERE pv.profile_id = ? AND pv.published_at IS NOT NULL AND pv.revoked_at IS NULL
       ORDER BY pv.published_at DESC LIMIT 50`,
    ).bind(profile.id).all<Record<string, unknown>>() : { results: [] };
    const passportHistory = (historyResult.results ?? []).map(serializePassportRow).map((item) => ({
      id: item.id,
      hvRating: item.hvRating,
      ovr: item.ovr,
      reliabilityScore: item.reliabilityScore,
      tier: item.tier,
      tierDivision: item.tierDivision,
      category: item.category,
      evidenceLevel: item.evidenceLevel,
      publishedAt: item.publishedAt,
    }));
    const currentPassport = passportHistory.find((item) => item.id === profile?.currentPassportId) ?? passportHistory[0] ?? null;
    const highestPassport = passportHistory.reduce<(typeof passportHistory)[number] | null>(
      (best, item) => !best || item.hvRating > best.hvRating ? item : best,
      null,
    );
    const latestAssessedAt = passportHistory[0]?.publishedAt ?? null;
    const nextEligibleAt = latestAssessedAt
      ? new Date(Date.parse(latestAssessedAt) + 7 * 86400000).toISOString()
      : null;
    return jsonResponse({
      user: { id: user.userId, locale: user.locale, provider: user.provider ?? "token", displayName: profile?.displayName ?? "High-Vive player" },
      profile,
      suggestedCountry,
      latestAssessment: assessment ? { assessment, commitment, passport } : null,
      passportOverview: {
        current: currentPassport,
        highest: highestPassport,
        history: passportHistory,
        latestAssessedAt,
        nextEligibleAt,
        canAssessNow: !nextEligibleAt || Date.parse(nextEligibleAt) <= Date.now(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireBrowserUser(request);
    await enforceRateLimit(request, "account:delete", 5, 86400, user.userId);
    const payload = await readJson(request, 4 * 1024);
    const d1 = getD1();
    const profile = await findProfileByUser(user.userId);
    if (!profile) throw new ApiError(404, "PROFILE_NOT_FOUND", "Profile not found.");
    if (payload.confirmation !== profile.handle) {
      throw new ApiError(400, "ACCOUNT_DELETE_CONFIRMATION_INVALID", "Enter your exact handle to permanently delete your account.");
    }
    const profileId = String(profile.id);
    const handle = String(profile.handle);
    const userMarker = `:${user.userId}:`;
    await d1.batch([
      d1.prepare("UPDATE profiles SET is_public = 0, current_passport_id = NULL WHERE id = ? AND user_id = ?").bind(profileId, user.userId),
      d1.prepare(
        `DELETE FROM audit_events WHERE actor_user_id = ?
         OR (resource_type = 'user' AND resource_id = ?)
         OR (resource_type = 'profile' AND resource_id = ?)
         OR (resource_type = 'assessment' AND resource_id IN (SELECT id FROM assessment_sessions WHERE user_id = ?))
         OR (resource_type = 'passport' AND resource_id IN (SELECT id FROM passport_versions WHERE profile_id = ?))`,
      ).bind(user.userId, user.userId, profileId, user.userId, profileId),
      d1.prepare("DELETE FROM passport_metric_evidence WHERE passport_id IN (SELECT id FROM passport_versions WHERE profile_id = ?)").bind(profileId),
      d1.prepare("DELETE FROM sample_proofs WHERE assessment_id IN (SELECT id FROM assessment_sessions WHERE user_id = ?)").bind(user.userId),
      d1.prepare("DELETE FROM benchmark_runs WHERE assessment_id IN (SELECT id FROM assessment_sessions WHERE user_id = ?)").bind(user.userId),
      d1.prepare("DELETE FROM evidence_commitments WHERE assessment_id IN (SELECT id FROM assessment_sessions WHERE user_id = ?)").bind(user.userId),
      d1.prepare("DELETE FROM passport_versions WHERE profile_id = ?").bind(profileId),
      d1.prepare("DELETE FROM assessment_sessions WHERE user_id = ?").bind(user.userId),
      d1.prepare("DELETE FROM idempotency_keys WHERE actor_key = ?").bind(user.userId),
      d1.prepare("DELETE FROM rate_limit_buckets WHERE instr(bucket_key, ?) > 0").bind(userMarker),
      d1.prepare("DELETE FROM passkey_challenges WHERE credential_id IN (SELECT credential_id FROM passkey_credentials WHERE user_id = ?)").bind(user.userId),
      d1.prepare("DELETE FROM passkey_credentials WHERE user_id = ?").bind(user.userId),
      d1.prepare("DELETE FROM browser_sessions WHERE user_id = ?").bind(user.userId),
      d1.prepare("DELETE FROM api_tokens WHERE user_id = ?").bind(user.userId),
      d1.prepare("DELETE FROM auth_device_sessions WHERE user_id = ?").bind(user.userId),
      d1.prepare("DELETE FROM auth_identities WHERE user_id = ?").bind(user.userId),
      d1.prepare("DELETE FROM profile_handle_history WHERE profile_id = ?").bind(profileId),
      d1.prepare("DELETE FROM passports WHERE nickname = ?").bind(handle),
      d1.prepare("DELETE FROM profiles WHERE id = ? AND user_id = ?").bind(profileId, user.userId),
      d1.prepare("DELETE FROM users WHERE id = ?").bind(user.userId),
      d1.prepare("UPDATE league_refresh_state SET refreshed_at = '1970-01-01T00:00:00.000Z' WHERE id = 'global'"),
    ]);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return jsonResponse({ deleted: true }, 200, {
      "set-cookie": `hv_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
