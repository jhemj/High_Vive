import { getD1 } from "../../db";
import { CATEGORIES, PROTOCOL_VERSION } from "../protocol/runtime.mjs";
import { ApiError, jsonResponse } from "./server";
import { passportSelectSql, serializePassportRow } from "./passports";
import { refreshLeagueRatings } from "./ratings";
import { isSupportedCountry } from "./countries";

export async function leaderboardResponse(request: Request, categoryOverride?: string) {
  await refreshLeagueRatings();
  const url = new URL(request.url);
  const category = categoryOverride ?? url.searchParams.get("category") ?? "";
  const country = (url.searchParams.get("country") ?? "").toUpperCase();
  if (category && !CATEGORIES.some((candidate) => candidate.key === category)) {
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "Leaderboard category not found.");
  }
  if (country && !isSupportedCountry(country)) {
    throw new ApiError(404, "COUNTRY_NOT_FOUND", "Leaderboard country not found.");
  }
  const page = Math.max(1, Math.min(10_000, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50));
  const offset = (page - 1) * pageSize;
  const activeCategory = "COALESCE(NULLIF(p.preferred_category, ''), pv.category)";
  const baseConditions = [
    "pv.published_at IS NOT NULL", "pv.revoked_at IS NULL", "p.is_public = 1",
    "p.current_passport_id = pv.id",
    "pv.evidence_level IN ('E2','E3','E4','E5')",
    "MAX(40, pv.reliability_score - (CAST(MAX(0, julianday('now') - julianday(COALESCE(pv.published_at, pv.created_at))) / 90 AS INTEGER) * 5)) >= 60",
    "pv.protocol_version = ?", "pv.is_demo = 0",
  ];
  const boardConditions = [...baseConditions];
  const boardBindings: unknown[] = [PROTOCOL_VERSION];
  if (category) {
    boardConditions.push(`${activeCategory} = ?`);
    boardBindings.push(category);
  }
  if (country) {
    boardConditions.push("p.country = ?");
    boardBindings.push(country);
  }
  const where = boardConditions.join(" AND ");
  const aggregateWhere = baseConditions.join(" AND ");
  const d1 = getD1();
  const [result, count, countryResult, categoryResult] = await Promise.all([
    d1.prepare(
      `${passportSelectSql} WHERE ${where}
       ORDER BY pv.hv_rating DESC, effectiveReliability DESC, pv.published_at ASC
       LIMIT ? OFFSET ?`,
    ).bind(...boardBindings, pageSize, offset).all<Record<string, unknown>>(),
    d1.prepare(
      `SELECT COUNT(*) AS count FROM passport_versions pv JOIN profiles p ON p.id = pv.profile_id WHERE ${where}`,
    ).bind(...boardBindings).first<{ count: number }>(),
    d1.prepare(
      `SELECT p.country AS country, COUNT(*) AS participants,
        ROUND(AVG(pv.hv_rating), 1) AS averageHvRating,
        ROUND(AVG(pv.ovr), 1) AS averageOvr,
        ROUND(AVG(MAX(40, pv.reliability_score - (CAST(MAX(0, julianday('now') - julianday(COALESCE(pv.published_at, pv.created_at))) / 90 AS INTEGER) * 5))), 1) AS averageReliability,
        MAX(pv.hv_rating) AS topHvRating
       FROM passport_versions pv JOIN profiles p ON p.id = pv.profile_id
       WHERE ${aggregateWhere} AND p.country IS NOT NULL AND p.country <> ''
       GROUP BY p.country
       ORDER BY averageHvRating DESC, averageReliability DESC, participants DESC, p.country ASC`,
    ).bind(PROTOCOL_VERSION).all<Record<string, unknown>>(),
    d1.prepare(
      `SELECT ${activeCategory} AS category, COUNT(*) AS participants,
        ROUND(AVG(pv.hv_rating), 1) AS averageHvRating,
        ROUND(AVG(pv.ovr), 1) AS averageOvr,
        ROUND(AVG(MAX(40, pv.reliability_score - (CAST(MAX(0, julianday('now') - julianday(COALESCE(pv.published_at, pv.created_at))) / 90 AS INTEGER) * 5))), 1) AS averageReliability,
        MAX(pv.hv_rating) AS topHvRating
       FROM passport_versions pv JOIN profiles p ON p.id = pv.profile_id
       WHERE ${aggregateWhere}
       GROUP BY ${activeCategory}
       ORDER BY averageHvRating DESC, averageReliability DESC, participants DESC, category ASC`,
    ).bind(PROTOCOL_VERSION).all<Record<string, unknown>>(),
  ]);
  return jsonResponse({
    board: "official",
    category: category || null,
    country: country || null,
    passports: (result.results ?? []).map(serializePassportRow),
    countries: (countryResult.results ?? []).map((row, index) => ({
      rank: index + 1,
      country: String(row.country),
      participants: Number(row.participants),
      averageHvRating: Number(row.averageHvRating),
      averageOvr: Number(row.averageOvr),
      averageReliability: Number(row.averageReliability),
      topHvRating: Number(row.topHvRating),
    })),
    categoryStandings: (categoryResult.results ?? []).map((row, index) => ({
      rank: index + 1,
      category: String(row.category),
      participants: Number(row.participants),
      averageHvRating: Number(row.averageHvRating),
      averageOvr: Number(row.averageOvr),
      averageReliability: Number(row.averageReliability),
      topHvRating: Number(row.topHvRating),
    })),
    pagination: { page, pageSize, total: Number(count?.count ?? 0), hasMore: offset + pageSize < Number(count?.count ?? 0) },
    protocolVersion: PROTOCOL_VERSION,
    categories: CATEGORIES,
  }, 200, { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" });
}
