import { getD1 } from "../../../../db";
import {
  CALIBRATION_VERSION, CANONICALIZATION_VERSION, PROTOCOL_VERSION, REDACTION_VERSION,
  SCANNER_VERSION,
} from "../../../../packages/protocol/runtime.mjs";
import {
  ApiError, auditEvent, enforceRateLimit, errorResponse, expiresIso, findProfileByUser,
  jsonResponse, nowIso, randomId, randomToken, requireAuthenticatedUser, sha256,
} from "../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    await enforceRateLimit(request, "assessment:create", 12, 3600, user.userId);
    const profile = await findProfileByUser(user.userId);
    if (!profile) throw new ApiError(409, "PROFILE_REQUIRED", "Create a profile and handle before starting an assessment.");

    const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 100);
    const d1 = getD1();
    if (idempotencyKey) {
      const cached = await d1.prepare(
        `SELECT response_json AS responseJson, response_status AS responseStatus FROM idempotency_keys
         WHERE actor_key = ? AND route = 'assessment:create' AND idempotency_key = ? AND expires_at > ? LIMIT 1`,
      ).bind(user.userId, idempotencyKey, nowIso()).first<{ responseJson: string; responseStatus: number }>();
      if (cached) return jsonResponse(JSON.parse(cached.responseJson), cached.responseStatus);
    }

    const assessmentId = randomId("asm");
    const uploadToken = randomToken("hv_upload", 32);
    const now = nowIso();
    const expiresAt = expiresIso(90);
    await d1.prepare(
      `INSERT INTO assessment_sessions (
        id, user_id, profile_id, status, protocol_version, scanner_version,
        canonicalization_version, redaction_version, upload_token_hash,
        expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      assessmentId, user.userId, profile.id, PROTOCOL_VERSION, SCANNER_VERSION,
      CANONICALIZATION_VERSION, REDACTION_VERSION, await sha256(uploadToken), expiresAt, now, now,
    ).run();
    await auditEvent(user.userId, "ASSESSMENT_CREATED", "assessment", assessmentId, { protocolVersion: PROTOCOL_VERSION });

    const origin = new URL(request.url).origin;
    const response = {
      assessmentId,
      uploadToken,
      protocolVersion: PROTOCOL_VERSION,
      scannerVersion: SCANNER_VERSION,
      calibrationVersion: CALIBRATION_VERSION,
      expiresAt,
      command: `npx high-vive assess --server ${origin} --assessment ${assessmentId} --token ${uploadToken}`,
    };
    if (idempotencyKey) {
      await d1.prepare(
        `INSERT OR IGNORE INTO idempotency_keys
         (id, actor_key, route, idempotency_key, response_status, response_json, expires_at, created_at)
         VALUES (?, ?, 'assessment:create', ?, 201, ?, ?, ?)`,
      ).bind(randomId("idk"), user.userId, idempotencyKey, JSON.stringify(response), expiresAt, now).run();
    }
    return jsonResponse(response, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
