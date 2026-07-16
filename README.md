# High-Vive

High-Vive is a vibe-coder benchmark league. A candidate's local Codex evaluates
real work evidence with a versioned protocol; the server validates the Passport,
recalculates the eight-metric Benchmark OVR, assigns a provisional ELO and tier,
and publishes the result to a field-specific leaderboard.

The server does not call an LLM.

## Product model

- **Benchmark OVR (0–1000):** weighted score across eight AI-collaboration metrics
- **Provisional ELO:** `600 + Benchmark OVR + Witness bonus`
- **Tier:** Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master,
  Grandmaster, or Challenger; lower tiers use divisions IV–I
- **Witness level:** confidence in evidence scope and continuity, separate from skill
- **Passport:** public benchmark result, selected evidence hashes, and assessment scope

The initial ELO is explicitly provisional because it is seeded from benchmark
performance rather than head-to-head matches. Future assessment cycles can update
it with normal ELO deltas.

## Local development

Requirements: Node.js 22.13+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Validation

```bash
pnpm build
pnpm test
pnpm run db:generate
```

## Structure

- `app/high-vive-app.tsx` — leaderboard, benchmark profile, submission flow
- `app/api/passports/route.ts` — deterministic validation, OVR, ELO, and tier calculation
- `db/schema.ts` — persistent Passport records in Cloudflare D1
- `drizzle/` — D1 migration
- `.openai/hosting.json` — Sites bindings

## Privacy and scoring

High-Vive stores derived scores, a public summary, selected evidence hashes, and
scope counts. It does not require source files or private work artifacts. Benchmark
scores are comparative signals, not identity verification or automatic hiring decisions.
