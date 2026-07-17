import { getD1 } from "../../../../../../db";
import { base64urlDecode, parseClientData, randomBase64url, verifyPasskeyAssertion } from "../../../../../../packages/shared/passkeys";
import { ApiError, auditEvent, cleanText, enforceRateLimit, errorResponse, expiresIso, jsonResponse, nowIso, randomId, randomToken, readJson, sha256 } from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

type Challenge = { id: string; kind: string; challenge: string; credentialId: string | null; payloadJson: string; expiresAt: string; usedAt: string | null };

export async function POST(request: Request) {
  try {
    await enforceRateLimit(request, "auth:passkey-verify", 40, 3600);
    const body = await readJson(request, 64 * 1024);
    const challengeId = cleanText(body.challengeId, 80, 1);
    const phase = body.phase === "register" ? "register" : body.phase === "authenticate" ? "authenticate" : "";
    const response = body.response && typeof body.response === "object" ? body.response as Record<string, unknown> : {};
    if (!challengeId || !phase) throw new ApiError(400, "PASSKEY_REQUEST_INVALID", "Passkey verification request is invalid.");
    const d1 = getD1();
    const row = await d1.prepare(
      `SELECT id, kind, challenge, credential_id AS credentialId, payload_json AS payloadJson,
       expires_at AS expiresAt, used_at AS usedAt FROM passkey_challenges WHERE id = ? LIMIT 1`,
    ).bind(challengeId).first<Challenge>();
    if (!row || row.usedAt || row.expiresAt <= nowIso()) throw new ApiError(410, "PASSKEY_CHALLENGE_EXPIRED", "This Passkey challenge has expired.");
    const challengePayload = JSON.parse(row.payloadJson) as Record<string, unknown>;

    if (phase === "register") {
      if (row.kind !== "REGISTER") throw new ApiError(409, "PASSKEY_PHASE_INVALID", "This Passkey challenge is not awaiting registration.");
      const credentialId = cleanText(response.id, 1024, 1);
      const clientDataJSON = cleanText(response.clientDataJSON, 8192, 1);
      const publicKeySpki = cleanText(response.publicKeySpki, 4096, 1);
      const algorithm = Number(response.algorithm);
      base64urlDecode(credentialId);
      base64urlDecode(publicKeySpki);
      if (![-7, -257].includes(algorithm)) throw new ApiError(400, "PASSKEY_ALGORITHM_UNSUPPORTED", "This Passkey algorithm is not supported.");
      const client = parseClientData(clientDataJSON);
      if (client.type !== "webauthn.create" || client.challenge !== row.challenge || client.origin !== challengePayload.origin) {
        throw new ApiError(400, "PASSKEY_REGISTRATION_INVALID", "Passkey registration verification failed.");
      }
      const occupied = await d1.prepare("SELECT credential_id FROM passkey_credentials WHERE credential_id = ? LIMIT 1").bind(credentialId).first();
      if (occupied) throw new ApiError(409, "PASSKEY_ALREADY_REGISTERED", "This Passkey is already registered.");

      const authenticationChallenge = randomBase64url(32);
      const advanced = await d1.prepare(
        `UPDATE passkey_challenges SET kind = 'AUTHENTICATE_NEW', challenge = ?, credential_id = ?,
         payload_json = ?, expires_at = ? WHERE id = ? AND kind = 'REGISTER' AND used_at IS NULL
         RETURNING id`,
      ).bind(authenticationChallenge, credentialId, JSON.stringify({ ...challengePayload, publicKeySpki, algorithm }), expiresIso(5), row.id).first<{ id: string }>();
      if (!advanced?.id) throw new ApiError(409, "PASSKEY_CHALLENGE_REPLAY", "This Passkey challenge has already been used.");
      return jsonResponse({ challengeId: row.id, publicKey: {
        challenge: authenticationChallenge,
        rpId: challengePayload.rpId,
        timeout: 300000,
        userVerification: "required",
        allowCredentials: [{ type: "public-key", id: credentialId }],
      } });
    }

    if (!['AUTHENTICATE', 'AUTHENTICATE_NEW'].includes(row.kind)) throw new ApiError(409, "PASSKEY_PHASE_INVALID", "This Passkey challenge is not awaiting authentication.");
    const claimed = await d1.prepare(
      "UPDATE passkey_challenges SET used_at = ? WHERE id = ? AND used_at IS NULL RETURNING id",
    ).bind(nowIso(), row.id).first<{ id: string }>();
    if (!claimed?.id) throw new ApiError(409, "PASSKEY_CHALLENGE_REPLAY", "This Passkey challenge has already been used.");
    const credentialId = cleanText(response.id, 1024, 1);
    const clientDataJSON = cleanText(response.clientDataJSON, 8192, 1);
    const authenticatorData = cleanText(response.authenticatorData, 8192, 1);
    const signature = cleanText(response.signature, 8192, 1);
    base64urlDecode(credentialId);
    if (row.credentialId && row.credentialId !== credentialId) throw new ApiError(403, "PASSKEY_CREDENTIAL_MISMATCH", "The Passkey credential does not match this challenge.");
    const client = parseClientData(clientDataJSON);
    if (client.type !== "webauthn.get" || client.challenge !== row.challenge || client.origin !== challengePayload.origin) {
      throw new ApiError(400, "PASSKEY_ASSERTION_INVALID", "Passkey assertion verification failed.");
    }

    const stored = row.kind === "AUTHENTICATE_NEW" ? null : await d1.prepare(
      `SELECT pc.user_id AS userId, pc.public_key_spki AS publicKeySpki, pc.algorithm, pc.counter
       FROM passkey_credentials pc JOIN users u ON u.id = pc.user_id AND u.status = 'ACTIVE'
       WHERE pc.credential_id = ? LIMIT 1`,
    ).bind(credentialId).first<{ userId: string; publicKeySpki: string; algorithm: number; counter: number }>();
    if (row.kind === "AUTHENTICATE" && !stored) throw new ApiError(404, "PASSKEY_NOT_FOUND", "This Passkey is not registered with High-Vive.");
    const publicKeySpki = stored?.publicKeySpki ?? String(challengePayload.publicKeySpki ?? "");
    const algorithm = stored?.algorithm ?? Number(challengePayload.algorithm);
    const counter = await verifyPasskeyAssertion({ publicKeySpki, algorithm, authenticatorData, clientDataJSON, signature, rpId: String(challengePayload.rpId), previousCounter: stored?.counter ?? 0 });

    const now = nowIso();
    const userId = stored?.userId ?? randomId("usr");
    const sessionToken = randomToken("hv_session", 32);
    const sessionId = randomId("bws");
    const sessionExpiry = expiresIso(30 * 24 * 60);
    const statements = [];
    if (!stored) {
      statements.push(
        d1.prepare("INSERT INTO users (id, status, locale, created_at, updated_at) VALUES (?, 'ACTIVE', ?, ?, ?)").bind(userId, request.headers.get("accept-language")?.toLowerCase().startsWith("ko") ? "ko" : "en", now, now),
        d1.prepare("INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?, ?, 'passkey', ?, ?)").bind(randomId("aid"), userId, credentialId, now),
        d1.prepare("INSERT INTO passkey_credentials (credential_id, user_id, public_key_spki, algorithm, counter, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(credentialId, userId, publicKeySpki, algorithm, counter, now, now),
      );
    } else {
      statements.push(d1.prepare("UPDATE passkey_credentials SET counter = ?, last_used_at = ? WHERE credential_id = ?").bind(counter, now, credentialId));
    }
    statements.push(
      d1.prepare("INSERT INTO browser_sessions (id, user_id, token_hash, expires_at, last_used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(sessionId, userId, await sha256(sessionToken), sessionExpiry, now, now),
    );
    await d1.batch(statements);
    await auditEvent(userId, stored ? "PASSKEY_LOGIN" : "PASSKEY_REGISTERED", "user", userId, { credential: await sha256(credentialId) });
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return jsonResponse({ authenticated: true, user: { id: userId, provider: "passkey" } }, 200, {
      "set-cookie": `hv_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
