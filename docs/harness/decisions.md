# 의사결정 로그 (Decision Log) — MeetLite

> 형식은 `templates/decision-log-template.md`(HANESS 원본, 수정 금지)를 따른다. append-only: 삭제·수정하지 않고, 바뀌면 새 항목으로 이전 항목을 참조한다.
> 이 파일은 ZOOM-CHAT의 프로젝트 기록이며 HANESS_AUTO 원본 내용이 아니다. (ORCHESTRATOR.md 규칙 G가 지정한 경로)

| ID | 일시 | 단계 | 질문/이슈 | 결정 내용 | 결정자 | 비가역성 | 영향받는 산출물 |
|----|------|------|-----------|-----------|--------|----------|------------------|
| DEC-001 | 2026-10-01 | 하네스 시작(4장 3번) | MCP를 연동해서 쓸 것인가 | **연동함.** 이 세션에서 실제 연결·응답을 확인한 서버: ① GitHub MCP(`mcp__github__list_branches`로 ZOOM-CHAT 브랜치 4개 조회 성공, 범위는 `jcs19752510-ui/zoom-chat` 저장소만) ② Google Drive, Claude Docs, claude-code-remote(이름상 연결 확인, 이번에 호출하지 않음). **미연결**: Playwright/Chrome 브라우저 자동화, Sentry/Datadog 옵저버빌리티, Slack/Teams 알림. **보류**: 단계 에이전트 파일의 `tools:` 줄에 `mcp__github` 추가는 하지 않았다. 사용자가 정한 필수 제약(HANESS_AUTO 복사본 수정·추가 금지)과 충돌하므로 사용자의 명시적 허락이 있어야 한다. 허락 전까지 해당 단계는 기존 방식(Bash `git log` 등)으로 수행하고 그 사실을 결과서에 남긴다(ORCHESTRATOR 5장). | 사용자 응답 | Low | `.claude/agents/02-planning-writer.md`, `11-documentation-writer.md`(변경 보류), 8단계 E2E(브라우저 MCP 없음, npm Playwright로 대체) |
| DEC-002 | 2026-10-01 | 하네스 시작(4장 3-1번) | 위험도 등급(Tier) | **Standard.** 확인 메모: ① 규칙 I(금융/의료/법률/보험 등 인허가 규제 업종)에 해당하지 않음 ② 규칙 J(AI/LLM 기능)에 해당하지 않음 ③ High 정의의 "개인정보"는 이 서비스가 IP·닉네임을 다루므로 경계에 있고 법령 적용 여부는 **미확인**(U-04). 다만 ORCHESTRATOR 1장은 완화 조항을 Low에만 두므로 Standard와 High의 규칙 강도는 같다(규칙 B 최소 2회, 06/07 분리). U-04 확인 결과 규제 대상으로 판정되면 이 항목을 새 DEC로 재검토한다. | 사용자 응답 | Medium | 규칙 B 검증 횟수, 06/07 단계 분리, 0-D 개인정보 문서 |
| DEC-003 | 2026-10-01 | 하네스 시작(4장 3-2번) | 병렬 실행 모드 | **P1(안전 병렬, 동시 최대 4개).** 문서 근거로 독립성이 확인된 작업만 동시 실행한다. 검증 강도(규칙 B, C)는 그대로다. 이 저장소의 게이트·Phase 승인 규칙이 우선하므로 병렬은 **한 게이트/Phase 안에서만** 적용하고, 게이트·Phase가 끝나면 멈춰 승인을 받는다(CLAUDE.md). 구체 병렬 계획은 하네스 5단계 착수 직전에 통지하며 그때마다 한 줄씩 기록한다. | 사용자 응답 | Low | 하네스 단계 호출 방식 전반 |

## 미결 사항 (결정 대기)
1. **13단계 ↔ Gate/Phase 대응표**: 하네스 단계(1~13)와 이 저장소의 Gate 0-A~0-E, Phase 1~7을 어떻게 연결할지 미확정이다. 하네스 단계를 실제로 호출하기 전에 사용자 확인을 받는다.
2. **요구 ID 체계**: 하네스 규칙 H는 `REQ-xxx`와 `docs/harness/traceability.md`를 요구하지만, 이 저장소는 FR/NFR/UX/SEC와 `docs/traceability.md`를 쓴다. 하네스 단계를 호출할 때 매핑 방식을 사용자와 정한다(하네스 파일은 수정하지 않는다).
3. **MCP `tools:` 줄 추가 허락 여부**(DEC-001 보류분).
