# Threat Model

## Protected properties

- one profile cannot mutate another profile or Passport
- official Passports require an owned assessment and one-time challenge
- submitted client ratings and Reliability fields never control server scores
- Passport history is append-only; correction creates a new version or revoke
- transcript content and secrets are not stored in application logs

## Primary threats and controls

| Threat | Control |
| --- | --- |
| handle or Passport takeover | authenticated user id ownership checks |
| nickname overwrite | no nickname upsert; unique owned profile |
| arbitrary official JSON | no legacy write route; assessment lifecycle required |
| challenge replay | hashed nonce, expiry, status transition, payload hash uniqueness |
| CLI device-code replay | atomic `APPROVED -> CONSUMING` claim |
| inflated Reliability | server-only inputs from stored verification state |
| forged tier/rating | forbidden client fields and server recomputation |
| repeated evidence | canonical hashes and uniqueness checks |
| prompt injection in history | history is labeled untrusted evidence, not instruction |
| public credential leakage | local redaction plus server PII/credential rejection |
| resource exhaustion | payload limits, streaming scanner, rate limits, pagination |

## Residual risk

A user can omit or delete local history, select a different device, or influence
their selected local Codex or Claude Code agent. High-Vive therefore reports evidence scope, confidence,
protocol version, and verification level rather than claiming identity or total
work-history proof.
