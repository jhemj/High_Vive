
# High-Vive v1.0 개발 작업명세서

- 대상 저장소: `jhemj/High_Vive`
- 제품 유형: 로컬 AI 증언 기반 바이브코더 벤치마크·리더보드
- 서버 LLM 호출: 0회
- 공식 평가자: 사용자 로컬 환경의 Codex 또는 Claude Code
- 문서 상태: 개발 착수 기준안

## 1. 제품 정의

High-Vive는 사용자의 로컬 Codex 또는 Claude Code 작업 이력을 기반으로 해당 AI가 자기 사용자의 AI 협업 역량을 평가하고, 그 결과를 비교 가능한 Passport와 리더보드로 공개하는 바이브코더 벤치마크 플랫폼이다.

| 역할 | 책임 |
| --- | --- |
| 사용자 | 평가 대상 |
| 사용자 로컬 Codex 또는 Claude Code | AI 평가자 |
| High-Vive CLI | 이력 수집, 마스킹, commitment, challenge 표본, 평가 실행, 제출 |
| High-Vive API | 계정, 상태 전이, 무결성, 점수 계산, 기록 보관 |
| High-Vive Web | Passport, 프로필, 공식 리더보드 |

서버는 Codex의 판단을 다른 LLM으로 재평가하지 않는다. 서버는 계정 소유권, 평가 세션, challenge, evidence commitment, schema, replay, 점수·티어·신뢰도 계산만 검증한다.

## 2. v1.0 성공 기준

1. 타 사용자의 Passport를 덮어쓸 수 없다.
2. 임의 JSON으로 공식 리더보드에 진입할 수 없다.
3. Codex transcript 원문은 기본적으로 서버로 전송하지 않는다.
4. Reliability, HV Rating, Tier, Calibrated OVR은 서버만 계산한다.
5. 모든 공식 Passport는 assessment, protocol version, evidence root에 연결된다.
6. Passport는 append-only 버전으로 보존된다.
7. 서버 LLM 호출은 0회다.
8. 실력과 절차 신뢰도를 분리해 표시한다.
9. demo·legacy·실사용자를 구분한다.
10. 테스트와 CI를 통과한 코드만 배포한다.

## 3. 범위

포함 범위는 사용자·프로필·handle 소유권, 로컬 Codex·Claude Code 전체 이력 평가, commitment/challenge, Passport, 10개 지표, Calibrated OVR, HV Rating, Provisional Tier, Reliability, Evidence Level, 공식 리더보드, 프로필·평가 이력, audit, revoke, rate limit, 데이터 삭제, protocol versioning, 테스트·CI다.

구인 공고, 구직 지원, 채용자 계정, 연락 요청, 메시지, 보수 정보, 채용 추천, ATS, 결제, 기업 대시보드, 신원·학력·경력 인증, 서버 LLM 평가, GitHub 필수 연동, 모바일 앱은 제외한다. 국가와 시간대는 선택 정보이며 순위에 사용하지 않는다.

## 4. 제품 원칙

- 평가 내용은 선택된 로컬 AI, 제출 과정과 자동 공개는 서버, 점수 계산은 서버가 담당한다.
- transcript, 절대 경로, tool arguments, 명령 출력, credential은 기본 업로드하지 않는다.
- Reliability는 실력 점수에 더하지 않는다.
- 높은 기록량은 높은 실력으로 자동 변환되지 않는다.
- 공식 순위는 동적으로 재산정되는 HV Rating, 동점은 현재 Reliability 순으로 정렬한다.
- Passport 등록 완료 후 다음 재평가는 7일 뒤 가능하며 실패·취소·만료된 평가는 제한을 소진하지 않는다.
- High-Vive는 신원, 전체 이력, 실제 업무 성과, 고용 적합성, Codex 평가의 절대 정확성을 보증하지 않는다.

공개 한계 문구:

> 이 평가 결과는 특정 기기와 평가 시점에 발견된 로컬 Codex 또는 Claude Code 이력을 High-Vive Protocol에 따라 분석한 AI Witness 평가입니다.

## 5. 용어와 상태 모델

- Assessment: 한 번의 평가 실행
- Witness: 사용자의 로컬 Codex 또는 Claude Code
- Evidence Commitment: 평가 전에 확정한 로컬 이력 Merkle root
- Challenge: commitment 이후 서버가 발급한 일회성 nonce와 selection seed
- Passport: Codex 평가와 서버 계산 점수가 포함된 공개 기록
- Raw Score: Codex의 10개 지표 원점수
- Calibrated OVR: 버전이 고정된 보정 규칙의 종합 점수
- HV Rating: OVR 70%, 시간 감쇠된 Reliability 15%, 공식 cohort 상대 위치 15%를 결합한 0–1000 리그 rating
- Reliability: 평가 절차와 증거 범위의 서버 계산 점수
- Evidence Level: 평가가 거친 검증 절차

정상 상태 전이는 `DRAFT → COMMITTED → CHALLENGED → ASSESSED → SUBMITTED → PUBLISHED`다. 예외 상태는 `EXPIRED`, `FAILED`, `REVOKED`, `CANCELLED`다. 상태는 서버만 변경한다.

## 6. Evidence Level

| Level | Label | 조건 |
| --- | --- | --- |
| E0 | SELF-REPORTED | legacy 또는 수동 JSON |
| E1 | LOCAL SCAN | 공식 CLI 형식 스캔 |
| E2 | CHALLENGE-BOUND | commitment 이후 서버 challenge 사용 |
| E3 | SAMPLE-PROVEN | challenge 표본의 Merkle proof 검증 |
| E4 | OUTCOME-VALIDATED | 결정론적 validator 통과 |
| E5 | LONGITUDINAL | 여러 평가 기간의 일관된 증거 |

공개 리더보드 조건은 E2 이상, Reliability 60 이상, current protocol, 소유 프로필 공개, non-demo, non-revoked다. 나머지는 공개 리더보드에 표시하지 않는다.

## 7. 능력치와 점수

| Key | 한국어 | 가중치 |
| --- | --- | ---: |
| contextPackaging | 맥락 설계 | 12% |
| aiDelegation | AI 위임 | 11% |
| verificationDiscipline | 검증 규율 | 14% |
| iterationQuality | 반복 개선 | 10% |
| outcomeYield | 결과물 전환율 | 14% |
| toolFluency | 도구 활용 | 10% |
| domainClarity | 도메인 이해도 | 8% |
| communicationQuality | 커뮤니케이션 | 7% |
| creativity | 창의적 문제 해결 | 8% |
| tokenEfficiency | 토큰 효율 | 6% |

각 지표는 `score`, `confidence`, `rationale`, `supportingEvidenceRefs`, `counterEvidenceRefs`를 포함한다. 점수는 0–100, confidence는 0–1이다. supporting evidence는 1개 이상이어야 하고, 80점 이상이면 counter evidence 또는 명시적 제한 설명이 필요하다.

`hv-calibration-v1` 규칙으로 계산한 값을 Calibrated Score와 Calibrated OVR로 표시한다. `hv-rating-v2`는 OVR 70%, 현재 Reliability 15%, 동점 보정된 공식 cohort 상대 위치 15%를 결합한다. 상대 위치는 승패 기반 Elo가 아니며, Challenge Arena가 구현되기 전까지 모든 Tier는 Provisional Tier다. Reliability는 등록 후 90일마다 5점 감쇠하고 최저 40점으로 제한한다.

## 8. Reliability

| 서버 검증 항목 | 최대점수 |
| --- | ---: |
| 계정·프로필 소유권 | 10 |
| evidence commitment | 20 |
| server challenge | 20 |
| 평가 범위와 기간 | 15 |
| sample proof | 15 |
| manifest 일관성 | 10 |
| outcome validator | 10 |

클라이언트는 `reliabilityScore`, `externalValidationCount`, `witnessLevel`, `verified`, `tier`, `hvRating`, `calibratedOVR`을 제출할 수 없다.

## 9. Commitment–Challenge–Assessment

1. 인증 사용자가 `POST /api/v1/assessments`로 assessment와 만료되는 upload token을 만든다.
2. CLI가 로컬 이력을 읽기 전용·스트리밍으로 스캔해 canonical Merkle root와 범위를 commitment한다.
3. 서버가 commitment 이후 단 한 번 nonce와 selection seed를 발급한다.
4. CLI가 seed로 시기, 프로젝트, 분야, 완료 여부, 도구·검증·길이·구조화 strata를 결정론적으로 선택한다.
5. 선택된 Codex 또는 Claude Code는 정량 집계, 선택 표본, rubric, anchor, 공개 schema만 읽고 10개 지표와 근거를 평가한다.
6. CLI가 공개·비공개 항목과 한계를 preview하고 manifest를 자동 제출한다.
7. 서버가 소유권, 상태, nonce, 만료, version, root, payload hash, schema, replay, proof, PII를 검증한 뒤 append-only Passport를 저장하고 즉시 공개한다.

## 10. CLI

공개 패키지는 다음 명령을 제공한다.

```text
high-vive login
high-vive doctor
high-vive assess
high-vive scan
high-vive status
high-vive preview
high-vive submit
high-vive logout
```

웹은 접속 환경을 Windows, macOS, Ubuntu로 자동 감지하고 수동 전환도 제공한다. Codex와 Claude Code 중 평가 에이전트를 선택할 수 있으며 Windows·macOS에서는 Codex 앱 deep link도 제공한다. 모든 플랫폼에는 Node.js가 없는 환경도 준비하는 OS별 단일 설치 명령을 제공한다. High-Vive 계정 인증은 평가 도구와 분리한다. 사용자는 플랫폼 Passkey 또는 선택적 ChatGPT 로그인을 사용할 수 있으며, Claude Code 사용자는 ChatGPT 계정 없이 Passkey로 가입·로그인할 수 있다. CLI는 인증 정보가 없으면 device login을 자동 시작한다. `.high-vive/private-evidence.json`과 평가 지시문은 업로드하지 않는다. 공개 draft와 submission manifest만 제출하고 유효한 제출은 즉시 공개한다. 스캐너는 streaming, symlink 제외, oversized/invalid 집계, 절대경로·session id 비공개, 중복 제거, 합성 transcript 제외, canonical root, resume/cache, progress, `--dry-run`, `--output`, `--codex-home`, `--claude-home`, `--privacy-mode`를 지원한다.

## 11. 개인정보

로컬 마스킹 대상은 API key, token, password, 이메일, 전화번호, IP, 홈 경로, 카드번호, 주민등록번호, 여권번호, query secret, 긴 base64, SSH private key, JWT, cloud credential, 사내 hostname, 경로 사용자명이다. 서버도 공개 텍스트의 이메일, 전화번호, API key, bearer token, private key marker, credential-like 문자열을 거부한다.

권장 문구:

> 기본 개인정보 및 credential 패턴이 로컬에서 마스킹됩니다. 업로드 전 공개 내용을 반드시 직접 확인하십시오.

## 12. 계정·프로필

handle은 3–24자의 영문 소문자, 숫자, `_`만 허용하고 고유값·예약어를 강제한다. handle 변경 이력을 남긴다. 필수 공개 정보는 handle, display name, 대표 분야, 현재 Passport, 평가일이다. 국가, 시간대, 자기소개, 외부 링크, 언어는 선택이다.

현재 Sites 배포에서는 플랫폼이 전달하는 인증 사용자 식별자를 서버에서 사용한다. 외부 공개 인증 제공자는 authorization 경계 뒤에서 교체 가능하게 유지한다.

## 13. 데이터 모델과 migration

핵심 테이블은 `users`, `auth_identities`, `profiles`, `profile_handle_history`, `assessment_sessions`, `evidence_commitments`, `passport_versions`, `passport_metric_evidence`, `sample_proofs`, `benchmark_runs`, `audit_events`, `idempotency_keys`, `rate_limit_buckets`다.

`ON CONFLICT(nickname) DO UPDATE`는 금지한다. Passport는 항상 새 버전으로 insert하고 `previous_version_id`를 연결한다. runtime 요청 중 schema 생성은 금지하고 deploy-time migration만 사용한다. 기존 Passport는 E0·LEGACY·v0.2로 이관하며 Official에서 제외한다. 기존 `eloRating`은 legacy 읽기 전용이고 새 Passport는 `hv_rating`을 사용한다.

## 14. API

```text
POST   /api/v1/auth/start
POST   /api/v1/auth/complete
GET    /api/v1/me
PATCH  /api/v1/me/profile
DELETE /api/v1/me

POST /api/v1/assessments
GET  /api/v1/assessments/{id}
PUT  /api/v1/assessments/{id}/commit
POST /api/v1/assessments/{id}/challenge
POST /api/v1/assessments/{id}/submit
POST /api/v1/assessments/{id}/cancel

GET  /api/v1/passports/{id}
POST /api/v1/passports/{id}/publish
POST /api/v1/passports/{id}/revoke
GET  /api/v1/profiles/{handle}/passports
GET  /api/v1/profiles/{handle}
GET  /api/v1/leaderboards
GET  /api/v1/leaderboards/{category}
GET  /api/v1/protocols/current
GET  /api/v1/protocols/{version}
```

모든 변경 요청은 인증 또는 assessment-scoped upload token, schema 검증, payload limit, idempotency, rate limit, error code, no-store, audit를 적용한다. nickname은 권한 기준이 아니다.

## 15. Web

메인은 단일 공식 리더보드, 분야 필터, podium, 전체 순위, HV Rating, Provisional Tier, Calibrated OVR, Reliability, Evidence Level, 평가일, protocol version을 표시한다. `/u/{handle}`은 현재 Passport, 요약, 강점·보완점, Raw/Calibrated 10개 지표, 범위, evaluator metadata, 과거 평가, 성장 추이, 한계 문구를 표시한다.

공식 등록 UI에서 raw JSON textarea를 제거한다. CLI 명령, assessment 상태, commitment, 평가 완료, 공개 preview, 자동 publish 흐름만 제공한다. demo는 `is_demo = true`, DEMO 배지, 공식 순위·참가자 수 제외를 강제한다.

## 16. Protocol 패키지

`packages/protocol`이 protocol version, metrics, categories, calibration, scoring, tier band, schema, rubric, anchor의 단일 원천이다. API·웹·CLI가 같은 정의를 사용한다. scoring 변경은 calibration version 변경과 테스트를 요구한다.

## 17. 테스트·CI

필수 unit 범위는 score, calibration, OVR, HV Rating, tier 경계, Reliability, 상태 전이, handle, evidence root, sampling, redaction, duplicate hash, protocol, legacy migration이다. property test는 결정성, 단조성, tier 경계, 중복 근거, client rating 무시를 검사한다. integration/security test는 전체 lifecycle, 소유권, replay, expired challenge, 중복 제출, PII, 대형 payload, malformed JSON, SQL injection, XSS를 포함한다.

모든 PR에서 install, typecheck, lint, unit, property, integration, migration, production build, E2E smoke, dependency audit를 실행한다. `pnpm test`는 scanner를 포함한 전체 테스트다.

## 18. 운영·보안

P0은 무인증 제출 금지, 소유권, nickname upsert 제거, one-time challenge, replay 방지, token 만료, size limit, rate limit, schema validation, 서버 점수·Reliability 계산, demo 분리다. 로그인, handle, assessment, commitment, challenge, 제출, publish, revoke, 관리자 조치, 삭제를 audit한다. 관리자도 Passport 직접 수정은 금지하고 revoke만 허용한다.

로그는 `requestId`, `userId`, `assessmentId`, `passportId`, `event`, `status`, `errorCode`, `durationMs`, `protocolVersion`만 구조화해 남기며 raw prompt, transcript, tool arguments, token, password, 이메일 원문, sample 원문을 기록하지 않는다.

## 19. 성능

- CLI는 history 크기에 비례해 메모리가 증가하지 않도록 streaming한다.
- 25 sessions마다 progress를 출력하고 cache/resume을 지원한다.
- leaderboard/profile API p95 목표는 500ms, submit 검증은 2초다.
- leaderboard는 DB에서 rating 순으로 pagination한다.
- category+rating, profile+published_at, assessment status 인덱스를 둔다.

## 20. 작업 패키지와 릴리스 Gate

- EPIC 0: Protocol 공통화, demo fixture 통합
- EPIC 1: 계정, profile, handle, authorization
- EPIC 2: Assessment lifecycle, commitment, challenge, replay
- EPIC 3: Scanner v1, canonical root, redaction, sampling, cache
- EPIC 4: Codex·Claude Code Witness, rubric, evidence refs, metadata, preview
- EPIC 5: append-only Passport, publish/revoke, legacy, share
- EPIC 6: HV Rating, Calibrated OVR, Reliability, Evidence Level, Official eligibility
- EPIC 7: public official leaderboard, profile, history, growth, onboarding
- EPIC 8: rate limit, PII, audit, deletion, threat model
- EPIC 9: unit, integration, scanner, security, E2E, CI, migration

Gate A는 protocol·소유권·신규 schema·상태 모델·legacy migration, Gate B는 scan·commitment·challenge·Witness·자동 publish·공식 리더보드·보안 테스트, Gate C는 share·history·rate limit·audit·삭제·운영·CI, Gate D는 P0 전체와 P1 핵심, migration, privacy, methodology, threat model, version 고정을 완료해야 통과한다.

## 21. Definition of Done

각 변경은 요구 구현, TypeScript strict, lint, unit·integration test, 보안·개인정보 검토, migration, 한·영 문구, API 문서, version bump, CI, 민감정보 없는 운영 로그, legacy 호환을 모두 충족해야 완료다.

## 22. 최종 제품 문구

> 당신과 함께 일한 AI가 평가하는 바이브코딩 실력.

> High-Vive는 로컬 Codex 작업 이력을 기반으로 AI 협업 역량을 평가하고, 비교 가능한 Passport와 리더보드로 기록하는 바이브코더 벤치마크 플랫폼입니다.

> High-Vive는 특정 기기에서 발견된 로컬 Codex 이력을 기반으로 한 AI Witness 평가입니다. 신원, 전체 업무 이력, 실제 업무 성과 또는 고용 적합성을 보증하지 않습니다.

> Codex·Claude Code 대화 원문과 로컬 파일은 기본적으로 서버에 업로드되지 않습니다. 공개 요약, 점수, 평가 범위와 evidence commitment만 preview 후 자동 등록·공개됩니다.
