import { getD1 } from "../../../../../db";
import { passportSelectSql, serializePassportRow } from "../../../../../packages/shared/passports";
import { ApiError, errorResponse, jsonResponse } from "../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const row = await getD1().prepare(`${passportSelectSql} WHERE pv.id = ? AND pv.published_at IS NOT NULL LIMIT 1`)
      .bind(id).first<Record<string, unknown>>();
    if (!row) throw new ApiError(404, "PASSPORT_NOT_FOUND", "Passport not found.");
    const metrics = await getD1().prepare(
      `SELECT metric_key AS metric, raw_score AS rawScore, calibrated_score AS calibratedScore,
       confidence, rationale, supporting_refs_json AS supportingRefsJson,
       counter_refs_json AS counterRefsJson, limitation
       FROM passport_metric_evidence WHERE passport_id = ? ORDER BY rowid`,
    ).bind(id).all<Record<string, unknown>>();
    return jsonResponse({ passport: serializePassportRow(row), metrics: metrics.results ?? [] });
  } catch (error) {
    return errorResponse(error);
  }
}
