import { getD1 } from "../../../../../db";
import {
  ApiError, auditEvent, cleanText, enforceRateLimit, errorResponse, expiresIso,
  jsonResponse, nowIso, randomId, randomToken, readJson, requireBrowserUser, sha256,
} from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth:complete", 60, 3600);
    const payload = await readJson(request, 8 * 1024);
    const userCode = cleanText(payload.userCode, 9).toUpperCase();
    const deviceCode = cleanText(payload.deviceCode, 200);
    const d1 = getD1();
    const now = nowIso();

    if (userCode) {
      const user = await requireBrowserUser(request);
      const row = await d1.prepare(
        "SELECT id, status, expires_at AS expiresAt FROM auth_device_sessions WHERE user_code = ? LIMIT 1",
      ).bind(userCode).first<{ id: string; status: string; expiresAt: string }>();
      if (!row) throw new ApiError(404, "DEVICE_CODE_NOT_FOUND", "The device code was not found.");
      if (row.expiresAt <= now) throw new ApiError(410, "DEVICE_CODE_EXPIRED", "The device code has expired.");
      if (row.status !== "PENDING") throw new ApiError(409, "DEVICE_CODE_USED", "The device code has already been used.");
      await d1.prepare(
        "UPDATE auth_device_sessions SET status = 'APPROVED', user_id = ?, approved_at = ? WHERE id = ? AND status = 'PENDING'",
      ).bind(user.userId, now, row.id).run();
      await auditEvent(user.userId, "CLI_DEVICE_APPROVED", "auth_device", row.id);
      return jsonResponse({ approved: true });
    }

    if (!deviceCode.startsWith("hv_device_")) throw new ApiError(400, "DEVICE_CODE_REQUIRED", "A device code is required.");
    const row = await d1.prepare(
      `SELECT id, status, user_id AS userId, expires_at AS expiresAt
       FROM auth_device_sessions WHERE device_code_hash = ? LIMIT 1`,
    ).bind(await sha256(deviceCode)).first<{ id: string; status: string; userId: string | null; expiresAt: string }>();
    if (!row) throw new ApiError(404, "DEVICE_CODE_NOT_FOUND", "The device code was not found.");
    if (row.expiresAt <= now) throw new ApiError(410, "DEVICE_CODE_EXPIRED", "The device code has expired.");
    if (row.status === "PENDING") return jsonResponse({ status: "PENDING" }, 202, { "retry-after": "3" });
    if (row.status !== "APPROVED" || !row.userId) throw new ApiError(409, "DEVICE_CODE_USED", "The device code cannot be exchanged.");

    // Atomically claim an approved device code before minting a token. A
    // second poll receives no RETURNING row and cannot replay the exchange.
    const claimed = await d1.prepare(
      `UPDATE auth_device_sessions
       SET status = 'CONSUMING'
       WHERE id = ? AND status = 'APPROVED'
       RETURNING user_id AS userId`,
    ).bind(row.id).first<{ userId: string }>();
    if (!claimed?.userId || claimed.userId !== row.userId) {
      throw new ApiError(409, "DEVICE_CODE_USED", "The device code cannot be exchanged.");
    }

    const token = randomToken("hv_api", 32);
    const tokenId = randomId("tok");
    await d1.batch([
      d1.prepare(
        `INSERT INTO api_tokens (id, user_id, token_hash, label, expires_at, created_at)
         VALUES (?, ?, ?, 'High-Vive CLI', ?, ?)`,
      ).bind(tokenId, claimed.userId, await sha256(token), expiresIso(90 * 24 * 60), now),
      d1.prepare("UPDATE auth_device_sessions SET status = 'CONSUMED', consumed_at = ? WHERE id = ? AND status = 'CONSUMING'").bind(now, row.id),
    ]);
    await auditEvent(claimed.userId, "CLI_TOKEN_ISSUED", "api_token", tokenId);
    return jsonResponse({ status: "COMPLETE", token, expiresAt: expiresIso(90 * 24 * 60) });
  } catch (error) {
    return errorResponse(error);
  }
}
