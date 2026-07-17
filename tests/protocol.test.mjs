import assert from "node:assert/strict";
import test from "node:test";
import {
  METRICS, PROTOCOL_VERSION, calculateCalibratedOvr,
  calculateHvRating, calculateReliability, calculateTier, canTransition, evidenceLevelFor,
  isOfficialPassport, isValidHandle, validateMetricReports,
} from "../packages/protocol/runtime.mjs";

const scores = Object.fromEntries(METRICS.map((metric) => [metric.key, 80]));

test("metric weights total 100 percent", () => {
  assert.equal(Math.round(METRICS.reduce((sum, metric) => sum + metric.weight, 0) * 100), 100);
});

test("server scoring uses OVR only for HV Rating", () => {
  const { ovr, calibratedScores } = calculateCalibratedOvr(scores);
  assert.equal(calculateHvRating(ovr), Math.round(ovr * 10));
  assert.equal(Object.keys(calibratedScores).length, 10);
  assert.equal(calculateHvRating(ovr), calculateHvRating(ovr));
});

test("tier boundaries are provisional band results", () => {
  assert.deepEqual(calculateTier(0), { tier: "Iron", tierDivision: "IV" });
  assert.equal(calculateTier(970).tier, "Challenger");
  assert.equal(calculateTier(930).tier, "Grandmaster");
});

test("Reliability is entirely server event based", () => {
  const base = { ownership: true, commitment: true, challenge: true, activeDays: 30, dateRangeDays: 90, sampleProof: false, manifest: true, outcome: false, longitudinal: false };
  assert.equal(calculateReliability(base), 67.5);
  assert.equal(evidenceLevelFor(base), "E2");
  assert.equal(calculateReliability({ ...base, sampleProof: true }), 82.5);
});

test("assessment state transitions reject skipping or overwrite", () => {
  assert.equal(canTransition("DRAFT", "COMMITTED"), true);
  assert.equal(canTransition("DRAFT", "PUBLISHED"), false);
  assert.equal(canTransition("PUBLISHED", "SUBMITTED"), false);
});

test("handle validation is narrow", () => {
  assert.equal(isValidHandle("ngmptdz"), true);
  assert.equal(isValidHandle("Bad-Handle"), false);
});

test("high metric scores require counter evidence or limitation", () => {
  const metrics = METRICS.map((metric) => ({ metric: metric.key, score: 81, confidence: 0.8, rationale: "This rationale is longer than twenty characters.", supportingEvidenceRefs: ["signal:test"], counterEvidenceRefs: [] }));
  assert.equal(validateMetricReports(metrics).ok, false);
  metrics.forEach((metric) => { metric.limitation = "Evidence is limited to this device."; });
  assert.equal(validateMetricReports(metrics).ok, true);
});

test("official eligibility separates skill and trust", () => {
  const passport = { evidenceLevel: "E2", reliabilityScore: 60, protocolVersion: PROTOCOL_VERSION, isDemo: false, profileIsPublic: true, revokedAt: null };
  assert.equal(isOfficialPassport(passport), true);
  assert.equal(isOfficialPassport({ ...passport, reliabilityScore: 59.9 }), false);
  assert.equal(isOfficialPassport({ ...passport, isDemo: true }), false);
});
