import { errorResponse } from "../../../../packages/shared/server";
import { leaderboardResponse } from "../../../../packages/shared/leaderboards";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return await leaderboardResponse(request);
  } catch (error) {
    return errorResponse(error);
  }
}
