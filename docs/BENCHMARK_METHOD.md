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
weighted result is Calibrated OVR. `hv-rating-v2` calculates the league rating
as `10 × (0.70 × OVR + 0.15 × effective Reliability + 0.15 × cohort position)`.
Cohort position is the tie-aware relative position by OVR among current,
eligible official Passports. A one-person cohort receives a neutral 50. This is
a cohort-relative benchmark rating, not a win/loss Elo. All tiers are explicitly
Provisional until a separate Challenge Arena exists.

Reliability is calculated only from server-observed verification events. The
stored base score loses five points for every completed 90 days after
publication, with a floor of 40. Effective Reliability contributes 15% to HV
Rating and gates Official eligibility. OVR and Reliability remain visible as
separate source values.

Publishing a Passport starts a seven-day reassessment cooldown. Creating,
cancelling, expiring, or failing an assessment does not consume the cooldown.
Each successful reassessment appends a Passport version and replaces only the
profile's current competitive version.

## Evidence

The scanner streams local JSONL and creates canonical leaf hashes and a Merkle
root. A server seed selects samples deterministically across time, project,
completion, tool use, verification behavior, and prompt structure. E2 means a
commitment-bound challenge; E3 additionally requires valid sample proofs.

High-Vive does not claim that the user supplied every local session or that the
Codex judgment is absolute truth.
