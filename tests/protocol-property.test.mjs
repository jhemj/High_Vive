import assert from "node:assert/strict";
import test from "node:test";
import {
  METRICS, TIER_BANDS, calculateCalibratedOvr, calculateReliability, calculateTier,
} from "../packages/protocol/runtime.mjs";

test("increasing any raw metric never decreases calibrated OVR", () => {
  for (const metric of METRICS) {
    for (let score = 0; score < 100; score += 1) {
      const base = Object.fromEntries(METRICS.map((item) => [item.key, 50]));
      base[metric.key] = score;
      const current = calculateCalibratedOvr(base).ovr;
      base[metric.key] = score + 1;
      const next = calculateCalibratedOvr(base).ovr;
      assert.ok(next >= current, `${metric.key} ${score} -> ${score + 1}`);
    }
  }
});

test("tier bands have no gaps or overlaps", () => {
  assert.equal(TIER_BANDS[0].min, 0);
  assert.equal(TIER_BANDS.at(-1).max, 1000);
  for (let index = 1; index < TIER_BANDS.length; index += 1) assert.equal(TIER_BANDS[index - 1].max + 1, TIER_BANDS[index].min);
  for (let rating = 0; rating <= 1000; rating += 1) assert.ok(calculateTier(rating).tier);
});

test("each verified Reliability component is monotonic", () => {
  const base = { ownership: false, commitment: false, challenge: false, activeDays: 0, dateRangeDays: 0, sampleProof: false, manifest: false, outcome: false };
  const baseline = calculateReliability(base);
  for (const key of ["ownership", "commitment", "challenge", "sampleProof", "manifest", "outcome"]) {
    assert.ok(calculateReliability({ ...base, [key]: true }) >= baseline);
  }
  assert.ok(calculateReliability({ ...base, activeDays: 60, dateRangeDays: 180 }) >= baseline);
});
