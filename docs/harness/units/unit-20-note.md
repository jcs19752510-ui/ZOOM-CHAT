# unit-20 노트 — NFR-14 mesh·TURN 실측 절차 문서

- **속도 트랙: L3**
- **병렬 실행**: 병렬 웨이브 W0(재시작). 동시 단위: unit-0(코드), unit-18(infra·coturn). 코드·infra 파일은 수정하지 않았다.

## 구현 범위
- 신규 `docs/05-qa/measurement-guide.md`: 준비물, 측정 변수(N=2/4/6, 화면공유, 기기×망), 합격 기준 제안(근거를 [코드]/[요구]/[미확인]으로 구분), `chrome://webrtc-internals` 사용법(bytesSent 증분→업링크, qualityLimitationReason, framesPerSecond, candidate-pair→direct/relay), CPU 측정, 기록 양식 3종(빈 양식), 결과 기입 위치, 한계, 5인 검토.
- `docs/README.md` 05-qa 인덱스에 한 줄 추가.
- 새 코드·스크립트 없음. 실제 측정은 수행하지 않았고 문서에 측정값이 없다(결과 절 "미수행").

## 설계서 대비 편차
- 설계서 §3 unit 표는 `performance-test.md`에 절차·합격 표를 넣는다고 했으나, 지시에 따라 별도 문서 `measurement-guide.md`로 만들고 결과 반영처로 performance-test.md §3을 지정했다. performance-test.md 자체는 수정하지 않음.
- 설계서의 "콘솔 getStats 스니펫"과 `scripts/` 샘플러는 만들지 않았다(코드 없음 범위). webrtc-internals와 수동 읽기로 대체.
- 02-planning의 NFR-14 인수 ① "결과가 performance-test.md에 있다"는 측정 수행 후 충족된다(현재 절차만).
- MC-07(추적성 표의 "제안")은 test-cases에 정의가 없어 새 문서에서 참조하지 않았다.

## 인수 조건 (6단계 테스터용)
1. `docs/05-qa/measurement-guide.md` 첫 줄에 용도, 버전·작성일·상태·주도·변경 이력·5인 검토가 있다.
2. 측정값 칸이 모두 비어 있고 "실측했다"는 서술이 없다. 모든 합격 기준에 근거 구분이 있고 [미확인]에는 수치 근거를 주장하지 않는다.
3. 인원(2/4/6)·화면공유·기기×망 조합과 업링크·fps·limitationReason·CPU·첫 영상 시간·relay 비율 측정 방법이 단계별로 있다.
4. 문서가 가리키는 코드 상수(1.5M/700k/400k)가 `qualityTier`와 일치한다.
5. `docs/README.md`에 링크가 있고 링크 대상이 존재한다.
6. 사람이 실제로 절차를 따라 해 보는 확인(webrtc-internals 항목명 등)은 미수행 → 수동 확인 필요.

## 수동 확인 필요
- Chrome 버전별 webrtc-internals 항목명, coturn 로그 문구, Safari/iPhone 통계 확인 방법(문서에 미확인으로 표기).
- 합격 기준 확정은 사용자 측정 후.

## 게이트
- 게이트 1: 코드 변경 없음, lint/type-check 비대상. `npm run check:docs` 실행: **실패 3건, 모두 이 단위 파일과 무관**(TC-301 ID 중복, SEC-06·SEC-10 추적성 TC 열 불일치 = 이 단위가 건드리지 않은 test-cases.md·추적성 쪽 문제, 출처 미조사). 새 문서 관련 오류(양식·ID 참조) 없음: 양식 점검 60개 문서에 포함되어 통과, 미정의 ID 오류 없음. 판정을 통과로 바꾸지 않는다. 다른 단위가 `--gen`/TC 정리 후 재확인 필요.
- 게이트 2: [x] 설계서와 일치(§5.4 변수·지표) [x] 에러 처리 해당 없음 [x] 입력 검증 해당 없음 [x] 시크릿 없음(덤프 커밋 금지 명시) [x] 새 의존성 없음 [x] 범위 외 변경 없음.

## 공유 문서 갱신 요청 (오케스트레이터가 반영)
| REQ-ID | 컬럼 | 값 |
|---|---|---|
| NFR-14 | 작업 단위 | unit-20 |
| NFR-14 | 구현 상태 | 절차서 작성 완료(`docs/05-qa/measurement-guide.md`), **실측 미수행**. 합격 수치는 측정 후 확정 |
| NFR-14 | 비고 | 설계서 §3의 "performance-test.md 단독 소유"와 달리 별도 문서로 작성, 결과는 performance-test.md §3에 반영 |
- decisions.md 기록 요청: 없음(규칙 A 질문 없음).
