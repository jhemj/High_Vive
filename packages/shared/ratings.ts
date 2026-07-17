import { getD1 } from "../../db";
import {
  PROTOCOL_VERSION, calculateEffectiveReliability, calculateHvRating, calculateTier,
} from "../protocol/runtime.mjs";

type RatingRow = {
  id: string;
  ovr: number;
  reliabilityScore: number;
  hvRating: number;
  tier: string;
  tierDivision: string | null;
  publishedAt: string;
};

const RATING_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function cohortPositions(rows: Array<{ id: string; ovr: number }>) {
  const sorted = [...rows].sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id));
  const positions = new Map<string, number>();
  if (sorted.length === 1) {
    positions.set(sorted[0].id, 50);
    return positions;
  }
  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].ovr === sorted[start].ovr) end += 1;
    const percentile = sorted.length > 1 ? ((start + end) / 2) / (sorted.length - 1) * 100 : 50;
    for (let index = start; index <= end; index += 1) positions.set(sorted[index].id, percentile);
    start = end + 1;
  }
  return positions;
}

export async function refreshLeagueRatings({ force = false }: { force?: boolean } = {}) {
  const d1 = getD1();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  if (!force) {
    const cutoff = new Date(now - RATING_REFRESH_INTERVAL_MS).toISOString();
    const claim = await d1.prepare(
      "UPDATE league_refresh_state SET refreshed_at = ? WHERE id = 'global' AND refreshed_at < ?",
    ).bind(nowIso, cutoff).run();
    if (Number(claim.meta?.changes ?? 0) === 0) return;
  }
  const result = await d1.prepare(
    `SELECT pv.id, pv.ovr, pv.reliability_score AS reliabilityScore,
      pv.hv_rating AS hvRating, pv.tier, pv.tier_division AS tierDivision,
      pv.published_at AS publishedAt
     FROM passport_versions pv JOIN profiles p ON p.id = pv.profile_id
     WHERE p.current_passport_id = pv.id AND p.is_public = 1
       AND pv.published_at IS NOT NULL AND pv.revoked_at IS NULL
       AND pv.evidence_level IN ('E2','E3','E4','E5')
       AND pv.protocol_version = ? AND pv.is_demo = 0`,
  ).bind(PROTOCOL_VERSION).all<RatingRow>();
  const rows = (result.results ?? []).map((row) => ({
    ...row,
    ovr: Number(row.ovr),
    reliabilityScore: Number(row.reliabilityScore),
    effectiveReliability: calculateEffectiveReliability(row.reliabilityScore, row.publishedAt, now),
  }));
  const competing = rows.filter((row) => row.effectiveReliability >= 60);
  const positions = cohortPositions(competing);
  const updates = rows.flatMap((row) => {
    const position = positions.get(row.id) ?? 50;
    const hvRating = calculateHvRating(row.ovr, row.effectiveReliability, position);
    const { tier, tierDivision } = calculateTier(hvRating);
    if (hvRating === Number(row.hvRating) && tier === row.tier && tierDivision === row.tierDivision) return [];
    return [d1.prepare("UPDATE passport_versions SET hv_rating = ?, tier = ?, tier_division = ? WHERE id = ?")
      .bind(hvRating, tier, tierDivision, row.id)];
  });
  for (let index = 0; index < updates.length; index += 50) await d1.batch(updates.slice(index, index + 50));
  if (force) {
    await d1.prepare("UPDATE league_refresh_state SET refreshed_at = ? WHERE id = 'global'").bind(nowIso).run();
  }
}
