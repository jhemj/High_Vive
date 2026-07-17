import { getD1 } from "../../../../../db";
import {
  enforceRateLimit, errorResponse, expiresIso, jsonResponse, nowIso, randomId,
  randomToken, sha256,
} from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth:start", 10, 3600);
    const deviceCode = randomToken("hv_device", 28);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const random = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
    const userCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    const id = randomId("dev");
    const expiresAt = expiresIso(10);
    await getD1().prepare(
      `INSERT INTO auth_device_sessions (id, device_code_hash, user_code, status, expires_at, created_at)
       VALUES (?, ?, ?, 'PENDING', ?, ?)`,
    ).bind(id, await sha256(deviceCode), userCode, expiresAt, nowIso()).run();
    const origin = new URL(request.url).origin;
    return jsonResponse({ deviceCode, userCode, verificationUri: `${origin}/connect?code=${encodeURIComponent(userCode)}`, expiresAt, pollIntervalSeconds: 3 }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
