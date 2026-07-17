import { getD1 } from "../../../../../db";
import { browserSessionToken, errorResponse, jsonResponse, nowIso, sha256 } from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = browserSessionToken(request);
    if (token) await getD1().prepare("UPDATE browser_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").bind(nowIso(), await sha256(token)).run();
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return jsonResponse({ signedOut: true }, 200, { "set-cookie": `hv_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}` });
  } catch (error) {
    return errorResponse(error);
  }
}
