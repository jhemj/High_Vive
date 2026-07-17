import { errorResponse, jsonResponse } from "../../../packages/shared/server";
import { leaderboardResponse } from "../../../packages/shared/leaderboards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    url.pathname = "/api/v1/leaderboards";
    if (!url.searchParams.has("board")) url.searchParams.set("board", "open");
    return leaderboardResponse(new Request(url, request));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST() {
  return jsonResponse({
    error: {
      code: "LEGACY_SUBMISSION_DISABLED",
      message: "Direct Passport JSON submission is disabled. Start an authenticated v1 assessment and use the official CLI.",
    },
  }, 410);
}
