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
recalculates the ten-metric percentile Benchmark OVR, assigns ELO and tier,
and publishes the result to a field-specific leaderboard.

The server does not call an LLM.

## Product model

- **Benchmark OVR (0–100):** weighted score across ten calibrated metric percentiles
- **ELO:** the primary ranking signal, derived from percentile OVR and verification reliability
- **Tier:** Iron, Bronze, Silver, Gold, Platinum, Emerald, Diamond, Master,
  Grandmaster, or Challenger; lower tiers use divisions IV–I
- **Verification reliability (0–100):** scope, continuity, and evidence integrity, separate from skill
- **Fixed categories:** Frontend, Backend, Full-stack, Mobile & Desktop, Data & Analytics,
  AI & ML Engineering, AI Ops & Automation, DevOps/Cloud/Infra, Security, and Product/Design/Content
- **Passport:** public benchmark result, selected evidence hashes, and assessment scope

Each raw metric keeps one decimal place. High-Vive maps raw metrics to a versioned
expert-cohort percentile curve before calculating OVR, preventing score inflation
from collapsing the leaderboard into a narrow band. Future assessment cycles can
update ELO with normal head-to-head or challenge deltas.

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
