# High-Vive 전체 Codex 이력 평가

High-Vive는 브라우저에서 로컬 Codex 기록을 직접 읽지 않는다. 로컬 스캐너가 `CODEX_HOME`의 `sessions`와 `archived_sessions`에 있는 모든 JSONL 파일을 스트리밍 방식으로 읽고, 원문 대신 집계·표본·해시로 구성된 비공개 증거 번들을 만든다.

```bash
pnpm passport:scan -- --nickname my_handle --country KR --timezone Asia/Seoul
```

생성물은 Git에서 제외되는 `.high-vive/` 아래에 저장된다.

- `history-evidence.json`: 전체 세션의 범위, 행동 신호, 토큰 집계, 도구 사용, 도메인 신호, 세션별 해시와 제한된 비식별 표본
- `assessment-instructions.md`: Codex가 증거 번들을 평가해 공개용 Passport를 만드는 절차
- `passport-draft.json`: Codex가 평가 후 작성할 공개 초안

모든 세션은 정량 집계와 evidence root에 반영된다. 다만 전체 대화 원문을 한 번에 모델 컨텍스트에 넣지는 않는다. 정성 평가는 세션별 대표 프롬프트를 비식별화한 표본으로 보정하며, 그 표본 수와 누락된 대용량 레코드 수를 Passport의 평가 범위에 명시한다.

High-Vive 서버로 전송되는 것은 사용자가 확인한 한국어·영어 공개 요약, 8개 점수, 분야, 집계 범위와 evidence hash뿐이다. 로컬 대화 원문, 파일 경로, 도구 인자, 명령 출력은 전송하지 않는다.
