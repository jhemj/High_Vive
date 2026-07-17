# high-vive CLI

The official local scanner and Codex Witness runner for High-Vive.

Use the OS-aware Passport flow on the High-Vive website. The CLI automatically
opens one-time login when `assess` or `prepare` is run without saved credentials.

`high-vive prepare` creates the commitment-bound assessment files for an
already-open Codex app. `high-vive assess` additionally launches Codex CLI and
asks for approval before submission.

Raw Codex transcripts, local paths, and private evidence remain on the device. Only the approved public Passport manifest, aggregate scope, evidence commitment, and optional Merkle proofs are submitted.
