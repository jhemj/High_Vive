# high-vive CLI

The official local scanner and AI Witness runner for High-Vive. It supports
Codex and Claude Code as first-class local assessment agents.

Use the OS-aware Passport flow on the High-Vive website. The CLI automatically
opens one-time login when `assess` or `prepare` is run without saved credentials.

`high-vive prepare` creates commitment-bound assessment files for an already
open AI coding agent. `high-vive assess --agent codex|claude-code` scans that
agent's history, runs the local witness, submits, and publishes automatically.

Raw transcripts, local paths, and private evidence remain on the device. Only
the public Passport manifest, aggregate scope, evidence commitment, and
optional Merkle proofs are submitted.
