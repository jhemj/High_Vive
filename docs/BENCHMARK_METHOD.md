# Benchmark Method

## Evaluation split

- Local Codex or Claude Code Witness: qualitative judgment and ten Raw Scores.
- High-Vive server: assessment ownership, challenge, commitment, schema,
  replay protection, calibration, HV Rating, Tier, Reliability, and eligibility.
- User: reviews public content and explicitly publishes the Passport.

The ten weighted metrics are defined only in `packages/protocol/runtime.mjs`.
Their weights total 100%. A metric report requires score, confidence, rationale,
supporting evidence references, and counter-evidence or a limitation for scores
of 80 or higher.

## Scores

`hv-calibration-v1` applies a bounded logistic calibration per metric. The
weighted result is Calibrated OVR. `HV Rating = round(OVR × 10)`. This is a
benchmark rating, not Elo and not an empirical percentile. All tiers in v1.0
are explicitly Provisional.

Reliability is calculated only from server-observed verification events. It
does not add to skill score. HV Rating determines rank; Reliability breaks
ties and gates Official eligibility.

## Evidence

The scanner streams local JSONL and creates canonical leaf hashes and a Merkle
root. A server seed selects samples deterministically across time, project,
completion, tool use, verification behavior, and prompt structure. E2 means a
commitment-bound challenge; E3 additionally requires valid sample proofs.

High-Vive does not claim that the user supplied every local session or that the
Codex judgment is absolute truth.
