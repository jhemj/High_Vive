import { getD1 } from "../../../../../db";
import {
  ApiError, auditEvent, cleanList, cleanText, enforceRateLimit, errorResponse,
  findProfileByUser, jsonResponse, normalizeHandle, nowIso, randomId, readJson,
  requireBrowserUser,
} from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const user = await requireBrowserUser(request);
    await enforceRateLimit(request, "profile:update", 20, 3600, user.userId);
    const payload = await readJson(request, 32 * 1024);
    const current = await findProfileByUser(user.userId);
    const handle = payload.handle === undefined && current ? String(current.handle) : normalizeHandle(payload.handle);
    const displayName = cleanText(payload.displayName, 40, 1) || handle;
    const bio = cleanText(payload.bio, 300);
    const country = cleanText(payload.country, 4).toUpperCase();
    const timezone = cleanText(payload.timezone, 60);
    const languages = cleanList(payload.languages, 8, 24);
    const links = cleanList(payload.links, 5, 200).filter((link) => /^https:\/\//i.test(link));
    const isPublic = payload.isPublic !== false;
    const d1 = getD1();
    const now = nowIso();

    const occupied = await d1.prepare(
      "SELECT id, user_id AS userId FROM profiles WHERE handle = ? LIMIT 1",
    ).bind(handle).first<{ id: string; userId: string | null }>();
    if (occupied?.userId && occupied.userId !== user.userId) {
      throw new ApiError(409, "HANDLE_TAKEN", "That handle is already owned by another account.");
    }

    let profileId: string;
    if (!current && occupied && !occupied.userId) {
      profileId = occupied.id;
      await d1.prepare(
        `UPDATE profiles SET user_id = ?, display_name = ?, bio = ?, country = ?, timezone = ?,
         languages_json = ?, links_json = ?, is_public = ?, updated_at = ? WHERE id = ? AND user_id IS NULL`,
      ).bind(user.userId, displayName, bio, country, timezone, JSON.stringify(languages), JSON.stringify(links), isPublic ? 1 : 0, now, profileId).run();
      await auditEvent(user.userId, "LEGACY_PROFILE_CLAIMED", "profile", profileId, { handle });
    } else if (!current) {
      profileId = randomId("prf");
      await d1.prepare(
        `INSERT INTO profiles (id, user_id, handle, display_name, bio, country, timezone, languages_json,
          links_json, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(profileId, user.userId, handle, displayName, bio, country, timezone, JSON.stringify(languages), JSON.stringify(links), isPublic ? 1 : 0, now, now).run();
      await d1.prepare(
        "INSERT INTO profile_handle_history (id, profile_id, previous_handle, new_handle, changed_at) VALUES (?, ?, NULL, ?, ?)",
      ).bind(randomId("phh"), profileId, handle, now).run();
      await auditEvent(user.userId, "PROFILE_CREATED", "profile", profileId, { handle });
    } else {
      profileId = String(current.id);
      const previousHandle = String(current.handle);
      await d1.prepare(
        `UPDATE profiles SET handle = ?, display_name = ?, bio = ?, country = ?, timezone = ?,
          languages_json = ?, links_json = ?, is_public = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      ).bind(handle, displayName, bio, country, timezone, JSON.stringify(languages), JSON.stringify(links), isPublic ? 1 : 0, now, profileId, user.userId).run();
      if (previousHandle !== handle) {
        await d1.prepare(
          "INSERT INTO profile_handle_history (id, profile_id, previous_handle, new_handle, changed_at) VALUES (?, ?, ?, ?, ?)",
        ).bind(randomId("phh"), profileId, previousHandle, handle, now).run();
      }
      await auditEvent(user.userId, "PROFILE_UPDATED", "profile", profileId, { handleChanged: previousHandle !== handle });
    }

    return jsonResponse({ profile: await findProfileByUser(user.userId) });
  } catch (error) {
    return errorResponse(error);
  }
}
