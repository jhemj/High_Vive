# Privacy

Raw Codex and Claude Code transcripts and local files stay on the user's device by default.
The server receives the public Passport, aggregate scope, evidence commitment,
challenge proof metadata, and evaluator metadata. A completed assessment is
published automatically; users can revoke the append-only Passport afterward.

The CLI masks common API keys, access tokens, passwords, email addresses,
telephone numbers, IP addresses, home paths, Korean resident identifiers,
passport/card patterns, query secrets, JWTs, long base64 values, SSH keys,
cloud credentials, internal hostnames, and usernames in paths. This is risk
reduction, not a guarantee of complete de-identification.

The server rejects obvious credential and contact patterns in public text.
Structured logs must never include prompts, transcripts, tool arguments,
tokens, passwords, raw emails, or evidence excerpts.

The CLI prints the generated preview before automatic submission and publication.
Revocation hides a Passport without rewriting its historical row.
Account deletion is audited and handled according to the operations runbook.
