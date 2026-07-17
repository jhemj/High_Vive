import { getD1 } from "../../../../../../db";
import { base64urlDecode, randomBase64url } from "../../../../../../packages/shared/passkeys";
import { ApiError, enforceRateLimit, errorResponse, expiresIso, jsonResponse, nowIso, randomId, readJson } from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth:passkey-options", 30, 3600);
    const payload = await readJson(request, 8 * 1024);
    const mode = payload.mode === "register" ? "register" : payload.mode === "authenticate" ? "authenticate" : "";
    if (!mode) throw new ApiError(400, "PASSKEY_MODE_INVALID", "Passkey mode must be register or authenticate.");
    const url = new URL(request.url);
    const rpId = url.hostname;
    const origin = url.origin;
    const challenge = randomBase64url(32);
    const challengeId = randomId("pkc");
    const createdAt = nowIso();

    if (mode === "register") {
      const userId = randomBase64url(32);
      await getD1().prepare(
        `INSERT INTO passkey_challenges (id, kind, challenge, payload_json, expires_at, created_at)
         VALUES (?, 'REGISTER', ?, ?, ?, ?)`,
      ).bind(challengeId, challenge, JSON.stringify({ rpId, origin, userId }), expiresIso(5), createdAt).run();
      return jsonResponse({
        challengeId,
        publicKey: {
          challenge,
          rp: { id: rpId, name: "High-Vive" },
          user: { id: userId, name: `player-${userId.slice(0, 8)}`, displayName: "High-Vive player" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          timeout: 300000,
          attestation: "none",
          authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" },
        },
      }, 201);
    }

    const requestedCredential = typeof payload.credentialId === "string" ? payload.credentialId : "";
    if (requestedCredential) base64urlDecode(requestedCredential);
    if (requestedCredential) {
      const exists = await getD1().prepare(
        "SELECT pc.credential_id FROM passkey_credentials pc JOIN users u ON u.id = pc.user_id AND u.status = 'ACTIVE' WHERE pc.credential_id = ? LIMIT 1",
      ).bind(requestedCredential).first();
      if (!exists) throw new ApiError(404, "PASSKEY_NOT_FOUND", "No High-Vive Passkey was found on this device.");
    }
    await getD1().prepare(
      `INSERT INTO passkey_challenges (id, kind, challenge, credential_id, payload_json, expires_at, created_at)
       VALUES (?, 'AUTHENTICATE', ?, ?, ?, ?, ?)`,
    ).bind(challengeId, challenge, requestedCredential || null, JSON.stringify({ rpId, origin }), expiresIso(5), createdAt).run();
    return jsonResponse({ challengeId, publicKey: {
      challenge, rpId, timeout: 300000, userVerification: "required",
      ...(requestedCredential ? { allowCredentials: [{ type: "public-key", id: requestedCredential }] } : {}),
    } }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
