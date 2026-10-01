> **이 문서의 용도** — 누가: 팀 전원과 사용자(승인자) / 언제: 어떤 문서가 어디에 있고 지금 어떤 상태인지 찾을 때 / 무엇을: 읽을 문서와 승인·미결 항목을 결정한다.

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
| 0.1 | 2026-10-01 | 최초 작성, 전체 문서 등록 |


## 읽는 순서
1. 루트 [`../README.md`](../README.md) → 2. `00-gates/gate-0A.md`, `gate-0B-0E.md`(결정·검토) → 3. `01-planning/prd.md` → 4. `05-qa/release-checklist.md`(출시 판정) → 필요한 문서.

## ID 체계
FR(기능) · NFR(비기능) · UX · SEC(보안) · POL(정책) · SCR(화면) · FLOW(플로우) · EVT(이벤트/API) · RISK · ADR · TC(단위·통합) · IT(E2E) · UAT · MC(수동·명령 점검) · KPI · A(가정) · E(엣지 케이스) · SC(시나리오) · U(사용자 확인 항목) · DEC(결정)
모든 요구는 정책/화면/이벤트 중 하나 이상과 테스트에 연결한다. 매트릭스(자동 생성): [`traceability.md`](traceability.md). 점검: `npm run check:docs`.

## 문서 목록
### 게이트 보고 (`00-gates/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [00-gates/gate-0A.md](00-gates/gate-0A.md) | Gate 0-A(기획) 보고, 미확인 U-01~09 | 전원 | 승인 | 0.1 |
| [00-gates/gate-0B-0E.md](00-gates/gate-0B-0E.md) | Gate 0-B~0-E 보고 | 전원 | 승인 | 0.1 |

### A. 기획 (`01-planning/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [01-planning/product-brief.md](01-planning/product-brief.md) | 비전·범위·KPI·비용 가설·위험 | 기획자 | 승인 | 0.1 |
| [01-planning/prd.md](01-planning/prd.md) | 요구사항·인수 조건·가정 | 기획자 | 승인 | 0.1 |
| [01-planning/personas-journeys.md](01-planning/personas-journeys.md) | 페르소나·저니·시나리오 | 기획자 | 승인 | 0.1 |
| [01-planning/ia-flows.md](01-planning/ia-flows.md) | 정보구조·유저 플로우·방 상태 전이 | 기획자 | 승인 | 0.1 |
| [01-planning/policies.md](01-planning/policies.md) | 서비스 정책(POL) | 기획자 | 승인 | 0.1 |
| [01-planning/screen-spec.md](01-planning/screen-spec.md) | 화면 정의서(SCR) | 기획자·디자이너 | 승인 | 0.1 |
| [01-planning/glossary.md](01-planning/glossary.md) | 용어집 | 기획자 | 승인 | 0.1 |
| [01-planning/roadmap.md](01-planning/roadmap.md) | MVP 이후 후보 | 기획자 | 승인 | 0.1 |

### B. 디자인 (`02-design/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [02-design/design-principles.md](02-design/design-principles.md) | UX 원칙·톤 | 디자이너 | 승인 | 0.1 |
| [02-design/design-system.md](02-design/design-system.md) | 토큰·컴포넌트·반응형·대비표 | 디자이너 | 승인 | 0.1 |
| [02-design/wireframes.md](02-design/wireframes.md) | 배치도와 구현 화면 스크린샷(목업 대체) | 디자이너 | 승인 | 0.1 |
| [02-design/interaction-spec.md](02-design/interaction-spec.md) | 상호작용 수치·규칙 | 디자이너 | 승인 | 0.1 |
| [02-design/content-guide.md](02-design/content-guide.md) | UX 라이팅·전체 문구(자동 생성) | 디자이너 | 승인 | 0.1 |
| [02-design/accessibility-spec.md](02-design/accessibility-spec.md) | WCAG 2.2 AA 점검표 | 디자이너 | 승인 | 0.1 |

### C. 기술 (`03-engineering/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [03-engineering/trd.md](03-engineering/trd.md) | 구성·시퀀스·상태 모델·성능·한계 | 아키텍트 | 승인 | 0.1 |
| [03-engineering/api-spec.md](03-engineering/api-spec.md) | REST·소켓 이벤트(EVT) 명세 | 개발자 | 승인 | 0.1 |
| [03-engineering/infra-deploy.md](03-engineering/infra-deploy.md) | 배포 구성·후보 비교(**대상 미결**) | 아키텍트 | 승인 | 0.1 |
| [03-engineering/observability.md](03-engineering/observability.md) | 로그·지표·알람 | 개발자 | 승인 | 0.1 |
| [03-engineering/dev-guide.md](03-engineering/dev-guide.md) | 개발 환경·규칙·의존성(사후 보고) | 개발자 | 승인 | 0.1 |
| [03-engineering/plan.md](03-engineering/plan.md) | Phase 진행과 남은 일 | 아키텍트 | 승인 | 0.1 |
| [03-engineering/risk-register.md](03-engineering/risk-register.md) | 위험·가정 대장 | 아키텍트 | 승인 | 0.1 |
| [03-engineering/adr/](03-engineering/adr/) | 결정 기록 6건: [0001](03-engineering/adr/0001-mesh-webrtc.md) · [0002](03-engineering/adr/0002-memory-state.md) · [0003](03-engineering/adr/0003-session-token.md) · [0004](03-engineering/adr/0004-turn-hmac.md) · [0005](03-engineering/adr/0005-single-binary-web.md) · [0006](03-engineering/adr/0006-websocket-only.md) | 아키텍트 | 승인 | 0.1 |

### D. 보안·개인정보 (`04-security/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [04-security/security.md](04-security/security.md) | 위협 모델·대응·남은 위험 | 보안 | 승인 | 0.1 |
| [04-security/security-checklist.md](04-security/security-checklist.md) | 출시 전 보안 점검표(증거 포함) | 보안 | 승인 | 0.1 |
| [04-security/privacy.md](04-security/privacy.md) | 데이터 처리·흐름·제3자 | 보안 | 승인 | 0.1 |
| [04-security/incident-response.md](04-security/incident-response.md) | 사고 대응 | 보안 | 승인 | 0.1 |
| [04-security/legal-drafts/privacy-policy-draft.md](04-security/legal-drafts/privacy-policy-draft.md) | 처리방침 초안(법률 검토 전) | 보안 | 초안 | 0.1 |
| [04-security/legal-drafts/terms-draft.md](04-security/legal-drafts/terms-draft.md) | 이용약관 초안(법률 검토 전) | 보안·기획 | 초안 | 0.1 |
| [../SECURITY.md](../SECURITY.md) | 취약점 신고 안내(연락처 미정) | 보안 | 초안 | — |

### E. 품질 (`05-qa/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [05-qa/test-plan.md](05-qa/test-plan.md) | 테스트 계획 | 개발자 | 승인 | 0.1 |
| [05-qa/test-cases.md](05-qa/test-cases.md) | TC/IT/UAT/MC 목록(자동 생성) | 개발자 | 승인 | 0.2 |
| [05-qa/integration-test.md](05-qa/integration-test.md) | E2E 시나리오와 결과 | 개발자 | 승인 | 0.1 |
| [05-qa/performance-test.md](05-qa/performance-test.md) | 성능 시험 결과·mesh 한계 | 개발자 | 승인 | 0.1 |
| [05-qa/compatibility-matrix.md](05-qa/compatibility-matrix.md) | 브라우저·기기 호환성(실기기 미검증) | 개발자 | 승인 | 0.1 |
| [05-qa/uat.md](05-qa/uat.md) | 사용자 인수 테스트(**미수행**) | 기획자 | 양식 | 0.1 |
| [05-qa/manual-checks.md](05-qa/manual-checks.md) | 수동·명령 점검 결과 | 개발자·보안 | 승인 | 0.1 |
| [05-qa/internal-test-guide.md](05-qa/internal-test-guide.md) | 내부 테스트 실행·기록 절차 | 내부 테스터·개발자 | 초안 | 0.1 |
| [05-qa/test-reports/internal-test-20261001.md](05-qa/test-reports/internal-test-20261001.md) | 내부 테스트 수행 결과(클라우드 자동화 범위) | 승인자·개발자 | 초안 | 0.1 |
| [05-qa/release-checklist.md](05-qa/release-checklist.md) | 출시 Go/No-Go | 기획자·개발자 | 승인 | 0.1 |
| [05-qa/defects.md](05-qa/defects.md) | 결함 대장(D-01~15 수정됨) | 개발자 | 승인 | 0.1 |
| 05-qa/test-reports/ | [phase-1](05-qa/test-reports/phase-1.md) · [2](05-qa/test-reports/phase-2.md) · [3](05-qa/test-reports/phase-3.md) · [4](05-qa/test-reports/phase-4.md) · [5](05-qa/test-reports/phase-5.md) · [6](05-qa/test-reports/phase-6.md) · [7](05-qa/test-reports/phase-7.md) | 전원 | 승인 | 0.1 |

### F. 운영/출시 (`06-ops/`)
| 문서 | 용도 | 주도 | 상태 | 버전 |
|---|---|---|---|---|
| [06-ops/runbook.md](06-ops/runbook.md) | 운영·배포·장애 대응 | 개발자·보안 | 승인 | 0.1 |
| [06-ops/user-guide.md](06-ops/user-guide.md) | 이용 가이드·FAQ | 기획자 | 승인 | 0.1 |
| [06-ops/CHANGELOG.md](06-ops/CHANGELOG.md) | 변경 기록·릴리스 노트 양식 | 개발자 | 승인 | 0.1 |

### 기타
| 문서 | 처리 |
|---|---|
| [traceability.md](traceability.md) | 요구 ↔ 정책·화면·플로우·EVT·테스트 매트릭스(자동 생성) |
| [harness/](harness/) | HANESS_AUTO 복사본 가이드(**수정 금지**). 단 `harness/decisions.md`는 이 프로젝트의 결정 로그(DEC-001~005) |
| 구 체계 초안 | `docs/plan.md`, `docs/security.md`는 새 문서로 대체되어 삭제했다 |
