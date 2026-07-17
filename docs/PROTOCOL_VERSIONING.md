# Protocol Versioning

The protocol version identifies metrics, rubric, output schema, categories,
sampling contract, and evaluation instructions. Calibration and tier bands have
separate versions.

- protocol semantic change: increment `PROTOCOL_VERSION`
- scanner/canonicalization/redaction change: increment its component version
- calibration/scoring change: increment `CALIBRATION_VERSION`
- challenge sampling contract change: increment `CHALLENGE_VERSION`

The constants live in `packages/protocol/runtime.mjs`; API, CLI, and web import
that package. A Passport stores all relevant versions. Official eligibility
requires the current supported protocol. Older records remain append-only in
storage and profile history when owned, but are excluded from the public
leaderboard. Version changes require schema snapshots and boundary tests.
