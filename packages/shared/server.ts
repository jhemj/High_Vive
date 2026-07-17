import { getD1 } from "../../db";
import { isValidHandle } from "../protocol/runtime.mjs";
import { isSupportedCountry } from "./countries";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return jsonResponse({ error: { code: error.code, message: error.message, details: error.details ?? null } }, error.status);
  }
  return jsonResponse({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, 500);
}

export async function readJson(request: Request, maxBytes = 256 * 1024) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "JSON_REQUIRED", "Content-Type must be application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request payload is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request payload is too large.");
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "MALFORMED_JSON", "The request body is not valid JSON.");
  }
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(prefix: string, bytes = 24) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  const token = btoa(String.fromCharCode(...values)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${prefix}_${token}`;
}

export function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function expiresIso(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function cleanText(value: unknown, maxLength: number, minLength = 0) {
  const text = typeof value === "string" ? value.normalize("NFC").trim().slice(0, maxLength) : "";
  if (text.length < minLength) return "";
  return text;
}

export function cleanList(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((item) => cleanText(item, maxLength)).filter(Boolean))).slice(0, maxItems)
    : [];
}

const reservedHandles = new Set([
  "admin", "administrator", "api", "app", "auth", "connect", "help", "high_vive",
  "highvive", "leaderboard", "login", "logout", "me", "official", "open", "passport",
  "protocol", "root", "security", "settings", "support", "system", "www",
]);

export function normalizeHandle(value: unknown) {
  const handle = cleanText(value, 24).toLowerCase();
  if (!isValidHandle(handle)) throw new ApiError(400, "INVALID_HANDLE", "Handle must be 3–24 lowercase letters, numbers, or underscores.");
  if (reservedHandles.has(handle)) throw new ApiError(400, "RESERVED_HANDLE", "That handle is reserved.");
  return handle;
}

const sensitivePatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?\d[\d .()-]{8,}\d)\b/,
  /\b(?:sk|pk|rk|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*\b/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*\S{8,}/i,
  /[A-Za-z0-9+/]{80,}={0,2}/,
];

export function findSensitivePattern(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const index = sensitivePatterns.findIndex((pattern) => pattern.test(text));
  return index === -1 ? null : `PII_PATTERN_${index + 1}`;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
}

type AuthenticatedUser = { userId: string; kind: "browser" | "api-token"; locale: "ko" | "en"; provider?: "sites" | "passkey" };

function requestLocale(request: Request): "ko" | "en" {
  const locale = request.headers.get("x-high-vive-locale") ?? request.headers.get("accept-language") ?? "";
  return locale.toLowerCase().startsWith("ko") ? "ko" : "en";
}

async function platformSubject(request: Request) {
  const raw = request.headers.get("oai-authenticated-user-email");
  if (!raw) return null;
  return sha256(raw.trim().toLowerCase());
}

export function countryFromRequest(request: Request) {
  const cloudflareRequest = request as Request & { cf?: { country?: string } };
  const country = cleanText(
    cloudflareRequest.cf?.country ?? request.headers.get("cf-ipcountry") ?? request.headers.get("x-country"),
    2,
  ).toUpperCase();
  return isSupportedCountry(country) ? country : "";
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const item of cookie.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return "";
}

export function browserSessionToken(request: Request) {
  const token = cookieValue(request, "hv_session");
  return token.startsWith("hv_session_") ? token : "";
}

async function optionalBrowserUser(request: Request): Promise<AuthenticatedUser | null> {
  const subject = await platformSubject(request);
  if (subject) return ensurePlatformUser(subject, requestLocale(request));

  const token = browserSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await getD1().prepare(
    `SELECT bs.user_id AS userId FROM browser_sessions bs
     JOIN users u ON u.id = bs.user_id AND u.status = 'ACTIVE'
     WHERE bs.token_hash = ? AND bs.revoked_at IS NULL AND bs.expires_at > ? LIMIT 1`,
  ).bind(tokenHash, nowIso()).first<{ userId: string }>();
  if (!row?.userId) return null;
  await getD1().prepare("UPDATE browser_sessions SET last_used_at = ? WHERE token_hash = ?").bind(nowIso(), tokenHash).run();
  return { userId: row.userId, kind: "browser", locale: requestLocale(request), provider: "passkey" };
}

async function ensurePlatformUser(subject: string, locale: "ko" | "en"): Promise<AuthenticatedUser> {
  const d1 = getD1();
  const existing = await d1.prepare(
    `SELECT ai.user_id AS userId FROM auth_identities ai
     JOIN users u ON u.id = ai.user_id AND u.status = 'ACTIVE'
     WHERE ai.provider = ? AND ai.provider_subject = ? LIMIT 1`,
  ).bind("sites", subject).first<{ userId: string }>();
  if (existing?.userId) return { userId: existing.userId, kind: "browser", locale, provider: "sites" };

  const userId = randomId("usr");
  const identityId = randomId("aid");
  const now = nowIso();
  try {
    await d1.batch([
      d1.prepare("INSERT INTO users (id, status, locale, created_at, updated_at) VALUES (?, 'ACTIVE', ?, ?, ?)").bind(userId, locale, now, now),
      d1.prepare("INSERT INTO auth_identities (id, user_id, provider, provider_subject, created_at) VALUES (?, ?, 'sites', ?, ?)").bind(identityId, userId, subject, now),
    ]);
    await auditEvent(userId, "USER_CREATED", "user", userId, { provider: "sites" });
    return { userId, kind: "browser", locale, provider: "sites" };
  } catch {
    const raced = await d1.prepare(
      "SELECT user_id AS userId FROM auth_identities WHERE provider = 'sites' AND provider_subject = ? LIMIT 1",
    ).bind(subject).first<{ userId: string }>();
    if (!raced?.userId) throw new ApiError(500, "AUTH_CREATE_FAILED", "Could not create the account.");
    return { userId: raced.userId, kind: "browser", locale, provider: "sites" };
  }
}

export async function requireBrowserUser(request: Request): Promise<AuthenticatedUser> {
  const user = await optionalBrowserUser(request);
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Sign in before continuing.");
  return user;
}

export async function optionalAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const browser = await optionalBrowserUser(request);
  if (browser) return browser;
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer hv_api_")) return null;
  const tokenHash = await sha256(authorization.slice(7));
  const row = await getD1().prepare(
    `SELECT at.user_id AS userId FROM api_tokens at
     JOIN users u ON u.id = at.user_id AND u.status = 'ACTIVE'
     WHERE at.token_hash = ? AND at.revoked_at IS NULL AND at.expires_at > ? LIMIT 1`,
  ).bind(tokenHash, nowIso()).first<{ userId: string }>();
  if (!row?.userId) return null;
  await getD1().prepare("UPDATE api_tokens SET last_used_at = ? WHERE token_hash = ?").bind(nowIso(), tokenHash).run();
  return { userId: row.userId, kind: "api-token", locale: requestLocale(request) };
}

export async function requireAuthenticatedUser(request: Request) {
  const user = await optionalAuthenticatedUser(request);
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Authentication is required.");
  return user;
}

export type AssessmentAccess = AuthenticatedUser & {
  assessment: Record<string, unknown>;
};

export async function requireAssessmentAccess(request: Request, assessmentId: string): Promise<AssessmentAccess> {
  const d1 = getD1();
  const assessment = await d1.prepare(
    `SELECT id, user_id AS userId, profile_id AS profileId, status, protocol_version AS protocolVersion,
      scanner_version AS scannerVersion, canonicalization_version AS canonicalizationVersion,
      redaction_version AS redactionVersion, upload_token_hash AS uploadTokenHash,
      nonce_hash AS nonceHash, selection_seed AS selectionSeed, challenge_version AS challengeVersion,
      expires_at AS expiresAt, committed_at AS committedAt, challenged_at AS challengedAt,
      assessed_at AS assessedAt, submitted_at AS submittedAt, published_at AS publishedAt,
      created_at AS createdAt, updated_at AS updatedAt
     FROM assessment_sessions WHERE id = ? LIMIT 1`,
  ).bind(assessmentId).first<Record<string, unknown>>();
  if (!assessment) throw new ApiError(404, "ASSESSMENT_NOT_FOUND", "Assessment not found.");

  const browser = await optionalBrowserUser(request);
  if (browser) {
    if (browser.userId !== assessment.userId) throw new ApiError(403, "ASSESSMENT_FORBIDDEN", "This assessment belongs to another account.");
    return { ...browser, assessment };
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.startsWith("Bearer hv_upload_")) {
    const tokenHash = await sha256(authorization.slice(7));
    if (tokenHash !== assessment.uploadTokenHash) throw new ApiError(403, "UPLOAD_TOKEN_INVALID", "The assessment upload token is invalid.");
    return { userId: String(assessment.userId), kind: "api-token", locale: requestLocale(request), assessment };
  }

  const user = await optionalAuthenticatedUser(request);
  if (!user) throw new ApiError(401, "AUTH_REQUIRED", "Authentication or an assessment upload token is required.");
  if (user.userId !== assessment.userId) throw new ApiError(403, "ASSESSMENT_FORBIDDEN", "This assessment belongs to another account.");
  return { ...user, assessment };
}

export function assertAssessmentActive(assessment: Record<string, unknown>) {
  if (String(assessment.expiresAt) <= nowIso() && !["SUBMITTED", "PUBLISHED", "REVOKED"].includes(String(assessment.status))) {
    throw new ApiError(410, "ASSESSMENT_EXPIRED", "The assessment has expired.");
  }
}

export async function auditEvent(actorUserId: string | null, eventType: string, resourceType: string, resourceId: string | null, metadata: Record<string, unknown> = {}) {
  await getD1().prepare(
    "INSERT INTO audit_events (id, actor_user_id, event_type, resource_type, resource_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).bind(randomId("aud"), actorUserId, eventType, resourceType, resourceId, JSON.stringify(metadata), nowIso()).run();
}

export async function enforceRateLimit(request: Request, route: string, limit: number, windowSeconds: number, actorUserId?: string) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const subject = actorUserId ?? await sha256(ip);
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
  const bucketKey = `${route}:${subject}:${windowStart}`;
  const resetAt = new Date((windowStart + 1) * windowSeconds * 1000).toISOString();
  const d1 = getD1();
  await d1.prepare(
    `INSERT INTO rate_limit_buckets (bucket_key, count, reset_at, updated_at) VALUES (?, 1, ?, ?)
     ON CONFLICT(bucket_key) DO UPDATE SET count = count + 1, updated_at = excluded.updated_at`,
  ).bind(bucketKey, resetAt, nowIso()).run();
  const row = await d1.prepare("SELECT count FROM rate_limit_buckets WHERE bucket_key = ?").bind(bucketKey).first<{ count: number }>();
  if ((row?.count ?? 1) > limit) throw new ApiError(429, "RATE_LIMITED", "Too many requests. Try again later.");
}

export async function findProfileByUser(userId: string) {
  return getD1().prepare(
    `SELECT id, user_id AS userId, handle, display_name AS displayName, bio, country,
      preferred_category AS preferredCategory, timezone,
      languages_json AS languagesJson, links_json AS linksJson, is_public AS isPublic,
      current_passport_id AS currentPassportId, created_at AS createdAt, updated_at AS updatedAt
     FROM profiles WHERE user_id = ? LIMIT 1`,
  ).bind(userId).first<Record<string, unknown>>();
}

export async function verifyMerkleProof(proof: Record<string, unknown>, expectedRoot: string) {
  const leaf = proof.leaf;
  const siblings = Array.isArray(proof.siblings) ? proof.siblings : [];
  if (!leaf || typeof leaf !== "object" || siblings.length > 32) return false;
  let current = await sha256(canonicalJson(leaf));
  if (proof.sampleHash !== `sha256:${current}`) return false;
  for (const item of siblings) {
    if (!item || typeof item !== "object") return false;
    const sibling = item as Record<string, unknown>;
    const hash = String(sibling.hash ?? "").replace(/^sha256:/, "");
    if (!/^[a-f0-9]{64}$/.test(hash) || !["left", "right"].includes(String(sibling.position))) return false;
    current = sibling.position === "left" ? await sha256(`${hash}:${current}`) : await sha256(`${current}:${hash}`);
  }
  return expectedRoot === `sha256:${current}`;
}
