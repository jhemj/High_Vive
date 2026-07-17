import { getD1 } from "../../../../../../db";
import {
  CANONICALIZATION_VERSION, REDACTION_VERSION, SCANNER_VERSION, canTransition,
} from "../../../../../../packages/protocol/runtime.mjs";
import {
  ApiError, assertAssessmentActive, auditEvent, cleanText, enforceRateLimit,
  errorResponse, jsonResponse, nowIso, randomId, readJson, requireAssessmentAccess,
} from "../../../../../../packages/shared/server";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await requireAssessmentAccess(request, id);
    await enforceRateLimit(request, "assessment:commit", 20, 3600, access.userId);
    assertAssessmentActive(access.assessment);
    if (!canTransition(String(access.assessment.status), "COMMITTED")) {
      throw new ApiError(409, "INVALID_ASSESSMENT_STATE", "Only a draft assessment can be committed.");
    }
    const payload = await readJson(request, 96 * 1024);
    const historyRoot = cleanText(payload.historyRoot, 80).toLowerCase();
    const scannerVersion = cleanText(payload.scannerVersion, 50);
    const canonicalizationVersion = cleanText(payload.canonicalizationVersion, 50);
    const redactionVersion = cleanText(payload.redactionVersion, 50);
    const sessionCount = Number(payload.sessionCount);
    const recordCount = Number(payload.recordCount);
    const activeDays = Number(payload.activeDays);
    const dateRange = payload.dateRange && typeof payload.dateRange === "object" ? payload.dateRange as Record<string, unknown> : {};
    const dateFrom = cleanText(dateRange.from, 40);
    const dateTo = cleanText(dateRange.to, 40);
    const scope = payload.scope && typeof payload.scope === "object" ? payload.scope : {};

    if (!/^sha256:[a-f0-9]{64}$/.test(historyRoot)) throw new ApiError(400, "INVALID_HISTORY_ROOT", "historyRoot must be a SHA-256 Merkle root.");
    if (scannerVersion !== SCANNER_VERSION || canonicalizationVersion !== CANONICALIZATION_VERSION || redactionVersion !== REDACTION_VERSION) {
      throw new ApiError(400, "UNSUPPORTED_SCANNER_VERSION", "Scanner, canonicalization, or redaction version is not supported.");
    }
    if (!Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > 1_000_000) throw new ApiError(400, "INVALID_SESSION_COUNT", "sessionCount is invalid.");
    if (!Number.isInteger(recordCount) || recordCount < 1 || recordCount > 1_000_000_000) throw new ApiError(400, "INVALID_RECORD_COUNT", "recordCount is invalid.");
    if (!Number.isInteger(activeDays) || activeDays < 1 || activeDays > 10_000) throw new ApiError(400, "INVALID_ACTIVE_DAYS", "activeDays is invalid.");
    if (!dateFrom || !dateTo || !Number.isFinite(Date.parse(dateFrom)) || !Number.isFinite(Date.parse(dateTo)) || Date.parse(dateFrom) > Date.parse(dateTo)) {
      throw new ApiError(400, "INVALID_DATE_RANGE", "dateRange is invalid.");
    }

    const d1 = getD1();
    const now = nowIso();
    try {
      await d1.batch([
        d1.prepare(
          `INSERT INTO evidence_commitments
           (id, assessment_id, history_root, root_algorithm, session_count, record_count, active_days, date_from, date_to, scope_json, created_at)
           VALUES (?, ?, ?, 'sha256-merkle-v1', ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(randomId("evc"), id, historyRoot, sessionCount, recordCount, activeDays, dateFrom, dateTo, JSON.stringify(scope), now),
        d1.prepare(
          "UPDATE assessment_sessions SET status = 'COMMITTED', committed_at = ?, updated_at = ? WHERE id = ? AND status = 'DRAFT'",
        ).bind(now, now, id),
      ]);
    } catch {
      throw new ApiError(409, "COMMITMENT_ALREADY_EXISTS", "This assessment already has an evidence commitment.");
    }
    await auditEvent(access.userId, "EVIDENCE_COMMITTED", "assessment", id, { sessionCount, activeDays });
    return jsonResponse({ assessmentId: id, status: "COMMITTED", historyRoot, committedAt: now });
  } catch (error) {
    return errorResponse(error);
  }
}
