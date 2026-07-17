import { protocolDescriptor } from "../../../../../packages/protocol/runtime.mjs";
import { jsonResponse } from "../../../../../packages/shared/server";

export async function GET() {
  return jsonResponse(protocolDescriptor(), 200, { "cache-control": "public, max-age=300" });
}
