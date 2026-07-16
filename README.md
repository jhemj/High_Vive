# High-Vive

High-Vive는 바이브코더의 Codex 협업 역량을 OVR, score-based ELO, League-style tier로 보여주는 로컬 AI 증언 기반 벤치마크 리더보드다.

## 전체 Codex 이력으로 Passport 만들기

현재 대화 하나가 아니라 로컬 `CODEX_HOME`의 전체 세션과 보관 세션을 스캔한다.

```bash
pnpm passport:scan -- --nickname my_handle --country KR --timezone Asia/Seoul
```

스캐너는 대화 원문을 서버로 보내지 않는다. `.high-vive/history-evidence.json`에 전체 범위의 집계·해시와 제한된 비식별 표본을 만들고, Codex가 이를 평가해 공개용 Passport 초안을 작성한다. 자세한 내용은 `docs/FULL_HISTORY_ASSESSMENT.md`를 참고한다.

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
