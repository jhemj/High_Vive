# High-Vive

High-Vive is a local AI-witnessed benchmark and leaderboard for vibe coders.
The user's local Codex or Claude Code evaluates that agent's full local history; the
server verifies the assessment process and calculates comparable scores. The
server makes **zero LLM calls**.

> 당신과 함께 일한 AI가 평가하는 바이브코딩 실력.

## v1.0 model

- **Raw Score:** the selected local AI Witness scores ten AI-collaboration metrics.
- **Calibrated OVR:** a versioned, deterministic calibration of the ten scores.
- **HV Rating:** `round(Calibrated OVR × 10)`, from 0 to 1000. It is not Elo.
- **Provisional Tier:** Iron through Challenger, derived from HV Rating.
- **Reliability:** a separate server-calculated score for process integrity.
- **Evidence Level:** E2 Challenge-Bound through E5 Longitudinal on the public leaderboard.
- **Public leaderboard:** current-protocol, non-demo Passport with E2+ and
  Reliability 60+. Legacy and self-reported records are not exposed.

Passport versions are append-only. Handles belong to authenticated profiles;
nickname-based upserts and official raw-JSON submission are disabled.

## Create a Passport

Open **Create my Passport** on the live site. The browser detects Windows,
macOS, or Ubuntu and selects the matching path. Windows and macOS users can
start the guided Codex workflow in the Codex app; every platform can choose
Codex or Claude Code and use a one-line installer that prepares the CLI.

Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/jhemj/High_Vive/main/scripts/install-high-vive.ps1 | iex"
```

macOS or Ubuntu:

```bash
curl -fsSL https://raw.githubusercontent.com/jhemj/High_Vive/main/scripts/install-high-vive.sh | bash
```

The CLI opens one-time High-Vive login automatically. `high-vive assess` scans
`CODEX_HOME/sessions` and `archived_sessions` as a
stream, commits a deterministic evidence root, receives a one-time server
challenge, selects reproducible samples, runs the selected local AI Witness, shows a
preview, then submits and publishes automatically. With `--agent claude-code`,
the same flow scans `~/.claude/projects` and runs the local Claude Code Witness.

Raw transcripts, absolute paths, tool arguments, command output, and local
files do not leave the device by default. Generated private evidence remains in
`.high-vive/` and is git-ignored.

Available commands:

```text
high-vive login | doctor | prepare | assess | scan | status | preview | submit | logout
```

## Local development

Requires Node.js 22.13+ and pnpm 11.

```bash
pnpm install
pnpm dev
```

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm db:check
pnpm build
```

Database schema changes are deploy-time migrations in `drizzle/`; request
handlers never create tables.

## Repository map

- `app/` — leaderboard, profile, device login, and v1 APIs
- `packages/protocol/` — single source of metrics, categories, scoring, tiers,
  schemas, and versions
- `packages/cli/` — publishable `high-vive` CLI and streaming scanner
- `packages/shared/` — API validation, authorization, redaction checks, and
  leaderboard queries
- `db/` and `drizzle/` — D1 schema and migrations
- `tests/` — unit, property, integration-contract, security, migration, and
  rendered-app tests
- `docs/HIGH_VIVE_V1_WORK_SPEC.md` — v1.0 implementation contract

## Product boundary

High-Vive is not a hiring service and does not certify identity, complete work
history, actual business outcomes, or employment suitability. It records an
AI Witness assessment of local evidence found on one device at one point in
time. See `docs/PRIVACY.md`, `docs/BENCHMARK_METHOD.md`, and
`docs/THREAT_MODEL.md`.
