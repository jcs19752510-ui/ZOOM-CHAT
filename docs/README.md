> **이 문서의 용도** — 누가: 팀 전원과 사용자(승인자) / 언제: 어떤 문서가 어디에 있고 지금 어떤 상태인지 찾을 때 / 무엇을: 읽을 문서와 승인 대기 중인 문서를 결정한다.

# 문서 인덱스

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 최신 유지 대상 (문서가 추가·변경될 때 같은 커밋에서 갱신) |
| 주도 | ① 기획자(PM) |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성. Gate 0-A 문서 등록 |

## 읽는 순서
1. `00-gates/gate-0A.md` (이번 게이트 보고와 확인 요청) → 2. `01-planning/prd.md` → 3. 나머지 기획 문서.

## ID 체계
FR(기능) · NFR(비기능) · UX · SEC(보안) · POL(정책) · SCR(화면) · FLOW(플로우) · EVT(이벤트/API, 0-C) · RISK · ADR · TC · IT · UAT · KPI · A(가정) · E(엣지 케이스) · SC(시나리오) · U(사용자 확인 항목)
모든 요구는 정책/화면/이벤트 중 하나 이상과 TC에 연결한다. 매트릭스: [`traceability.md`](traceability.md). 정합성 점검: `node scripts/check-docs.mjs`.

## 문서 목록
### 게이트 보고 (`00-gates/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [00-gates/gate-0A.md](00-gates/gate-0A.md) | Gate 0-A 완료 보고, 5인 검토, 확인 요청 | 전원 | 승인 대기 | 0.1 |

### A. 기획 (`01-planning/`) — Gate 0-A
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [01-planning/product-brief.md](01-planning/product-brief.md) | 비전·범위·KPI·비용 가설·위험 | 기획자 | 초안 | 0.1 |
| [01-planning/prd.md](01-planning/prd.md) | 요구사항(FR/NFR/UX/SEC)·인수 조건·가정 | 기획자 | 초안 | 0.1 |
| [01-planning/personas-journeys.md](01-planning/personas-journeys.md) | 페르소나·저니·핵심 시나리오 | 기획자 | 초안 | 0.1 |
| [01-planning/ia-flows.md](01-planning/ia-flows.md) | 정보구조·유저 플로우·방 상태 전이 | 기획자 | 초안 | 0.1 |
| [01-planning/policies.md](01-planning/policies.md) | 서비스 정책(POL) | 기획자 | 초안 | 0.1 |
| [01-planning/screen-spec.md](01-planning/screen-spec.md) | 화면 정의서(SCR) | 기획자·디자이너 | 초안 | 0.1 |
| [01-planning/glossary.md](01-planning/glossary.md) | 용어집 | 기획자 | 초안 | 0.1 |
| [01-planning/roadmap.md](01-planning/roadmap.md) | MVP 이후 후보 | 기획자 | 초안 | 0.1 |

### B. 디자인 (`02-design/`) — Gate 0-B: 미착수
design-principles · design-system · wireframes · mockups/ · interaction-spec · content-guide · accessibility-spec

### C. 기술 (`03-engineering/`) — Gate 0-C: 미착수
trd · api-spec · infra-deploy · observability · dev-guide · adr/ · plan · risk-register

### D. 보안/개인정보 (`04-security/`) — Gate 0-D: 미착수
security · security-checklist · privacy · incident-response · legal-drafts/

### E. 품질 (`05-qa/`) — Gate 0-E: 미착수
test-plan · test-cases · integration-test · performance-test · compatibility-matrix · uat · release-checklist · defects · test-reports/

### F. 운영/출시 (`06-ops/`) — Phase 7: 미착수
runbook · user-guide · CHANGELOG

## 구 체계 초안 (대체 예정)
| 문서 | 처리 |
|---|---|
| [plan.md](plan.md) | 2026-10-01 이전의 구 체계 초안. Gate 0-C에서 `03-engineering/plan.md`, `trd.md`, `api-spec.md`로 흡수 후 삭제 |
| [security.md](security.md) | 구 체계 초안. Gate 0-D에서 `04-security/security.md`로 이전·보강 후 삭제 |
| [harness/](harness/) | HANESS_AUTO 복사본 가이드. **수정 금지**(읽기 전용). 단 `harness/decisions.md`는 이 프로젝트의 결정 로그(DEC-001~003, 우리가 작성) |
