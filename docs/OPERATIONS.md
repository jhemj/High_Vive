# Operations

## Release order

1. Back up/export the D1 database.
2. Run `pnpm install --frozen-lockfile`.
3. Run typecheck, lint, tests, migration check, and production build.
4. Apply D1 migrations before deploying application code.
5. Deploy through the configured Sites project.
6. Verify protocol, public official leaderboard, profile, auth rejection,
   automatic publication, and absence of legacy submission routes.

Migration failure stops the release. Request handlers must never create tables.
Restore is performed from the pre-release D1 backup; forward fixes use a new
migration rather than editing an applied migration.

## Required structured log fields

`requestId`, `userId`, `assessmentId`, `passportId`, `event`, `status`,
`errorCode`, `durationMs`, and `protocolVersion` where applicable. Never log
raw prompts, transcripts, tool arguments, auth tokens, passwords, raw email, or
evidence excerpts.

## Incident actions

An administrator may revoke but may not edit a Passport. Any replacement is a
new append-only version. Audit login, handle changes, assessment transitions,
submission success/failure, publish, revoke, administrator actions, and data
deletion.
