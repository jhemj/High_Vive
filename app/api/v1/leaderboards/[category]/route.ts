import { leaderboardResponse } from "../../../../../packages/shared/leaderboards";
import { errorResponse } from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ category: string }> }) {
  try {
    const { category } = await context.params;
    return await leaderboardResponse(request, category);
  } catch (error) {
    return errorResponse(error);
  }
}
