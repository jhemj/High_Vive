import { PROTOCOL_VERSION, protocolDescriptor } from "../../../../../packages/protocol/runtime.mjs";
import { ApiError, errorResponse, jsonResponse } from "../../../../../packages/shared/server";

export async function GET(_request: Request, context: { params: Promise<{ version: string }> }) {
  try {
    const { version } = await context.params;
    if (version !== PROTOCOL_VERSION) throw new ApiError(404, "PROTOCOL_NOT_FOUND", "Protocol version not found.");
    return jsonResponse(protocolDescriptor(), 200, { "cache-control": "public, max-age=300" });
  } catch (error) {
    return errorResponse(error);
  }
}
