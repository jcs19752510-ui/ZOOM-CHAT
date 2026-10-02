# 내부 검증 로그 (Internal Verification Log) — unit-11 6단계(소급)

## 대상 산출물
- `docs/harness/units/unit-11-test.md`, 신규 시험 `apps/web/src/components/participantsPanelActions.test.ts`(TC-470b~k)
- 06-unit-tester (Claude Sonnet 5.5) / Tier Standard(규칙 B 최소 2회) / 5단계 노트 없는 소급 검증

## 1차 검증 (작성자 관점)
- 일시: 2026-10-02
- [x] 인수 조건을 prd.md FR-13~17·screen-spec·CLAUDE.md에서 도출(노트 없음 명시), 요구↔시험 표 작성
- [x] 이전 중단 잔여물(`.harness-tmp/mut_06_unit11`)의 소유 확인 후 삭제, 새 복사본에서 시작. 시작 상태 기존 6개 PASS
- [x] 변이 39종(M01~M39): 기존 6개만으로 생존이 다수(핸들러 배선·줄별 상태·입력 배열 변경 등) → TC-470b~j 9개 추가
- [x] 생존 6종 분석: M15(아이콘)·M30(호스트 도구 묶음 이름)·M37(e2e가 쓰는 `people-list`)·M39(trim) 실제 공백 → TC-470k로 사망, M28(무해 속성) 동등
- 판정: 시험 보강 필요 → 보강 후 재검증

## 2차 검증 (독립 심사자 관점)
- 일시: 2026-10-02
- [x] 다른 패턴의 독립 변이 14종(M40~M53): 생존 6 → 동등 3(M41·M42 호출 래핑, M51 isHost 하 동일) + **실제 공백 3**(M44 나/호스트 구분 — 내 시험이 self=host 설정만 써서 못 잡음, M49 제목 aria-hidden, M53 닫기 아이콘 aria-hidden 제거)
- [x] TC-470h를 self≠host로 변경·왕관 위치 확인, TC-470j에 제목·아이콘 aria 확인 추가 → M44·M49·M53 사망, 이전 변이 M09·M15·M16·M17 재확인 사망
- [x] 시험 자체 오류 정정: lucide 아이콘 판별(forwardRef 객체), `vi.fn` 타입 오류(typecheck)
- [x] 경계 재검토: 빈 목록, 1인 방, 빈 닉네임, 호스트 null, selfId 빈 문자열, 호스트가 뒤 순번(승계 후)
- [x] 게이트: lint 0, typecheck 0(수정 후), 웹 51파일 372 통과+2 expected fail, check-docs 통과, 제품 코드 diff 없음, 임시 디렉터리 삭제
- [x] 한계: e2e·build·실브라우저·서버 권한은 미검증(지시상 금지·타 단위 소유)
- 최종: 53종 중 49 사망 / 동등 생존 4. 판정 CONDITIONAL PASS (제품 결함 0, Low 관찰 3)
