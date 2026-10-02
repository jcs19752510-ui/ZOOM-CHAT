# 테스트 결과서 — unit-07 (웹 미디어: media/{MediaTransport,MeshTransport,pathType}.ts, lib/{media,audioLevel}.ts) — 소급 6단계

## 1. 개요
- 테스트 대상: 작업 단위 unit-07. 5단계 노트(`unit-07-note.md`) 없음 — 소급 단위라 인수 조건은 `03-system-design.md` unit-07 행(FR-04·07·08·09·10·12·19·22, NFR-03·05·13·15, SEC-09, UX-07·14)과 PRD 인수 조건에서 도출했다.
- 테스트 유형: 단위(소급 보강: 가짜 PeerConnection/AudioContext/getUserMedia 기반 동작 시험 + 변이 시험). Tier Standard(DEC-002, 규칙 B 2회 이상), 속도 트랙 L3. 병렬 웨이브(소급 웹 06~12 동시), 06·07 병합 미적용.
- 목적: 기존 시험(`meshTransport.fake`·`pathMetricsAdversarial`·`pathType`·`localMedia`·`audioLevel`)이 놓친 분기를 변이 시험으로 찾아 보강하고, 이전 중단 실행이 남긴 시험 파일을 이어 완성한다.
- 수행자: 06-unit-tester (Claude Sonnet 5.5), 2026-10-02.

## 2. 범위
- 범위: LocalMedia(시작·음소거·카메라 해제/재획득·장치 전환/롤백·reconcile·구독), 오류 분류, 모바일·화면공유 지원 판정, MeshTransport(perfect negotiation·m-line 역할 분배·ICE 재시작·경로 판정·품질 판정·송신 상한), classifyPath, useAudioLevel(임계·유지시간·15fps·수명).
- 제외/미검증: 실제 브라우저의 getUserMedia·RTCPeerConnection·AudioContext 동작(가짜 객체 기반), 실제 네트워크 경로·TURN(unit-18·e2e IT-21·22·46 소유), **e2e 재실행(`webRetro.spec.ts` IT-52·IT-59 포함)은 지시상 playwright·build 금지라 미검증**, 타 브라우저·iOS Safari 실기기(미검증).
- 제품 코드는 수정하지 않았다. 시험 파일·문서 행만 추가했다.

## 3. 환경·도구
- Node 22, Vitest 5.0.3(`--root apps/web`, 환경 node). jsdom 미설치 → `testing/hookHarness.ts`(unit-08 소유, 읽기만 사용)의 `fakeHooks`·`mount`로 훅을 구동(TC-476p·q).
- 변이 시험은 **저장소 파일을 직접 바꾸지 않고** `.harness-tmp/mut_06_unit07/`에 제품 5개·시험 파일 복사본을 두고 1줄씩 바꿔 vitest를 돌렸다(원본 불변이 구조적으로 보장되며 `git diff --stat -- lib/media.ts lib/audioLevel.ts media/`가 비어 있음을 매 라운드 후 확인). 변이 하네스(python)도 같은 폴더에 있었고 정리했다.
- 잔여 확인: 이전 중단 실행의 `.harness-tmp/mut_06_unit07/`(하네스·결과 로그 포함)을 발견해 이어 사용한 뒤 삭제(규칙 K).
- 5단계 게이트: 노트가 없는 소급 단위라 6단계에서 재실행해 확인(8절·9절 참고).

## 4. 케이스와 결과
### 4.1 인수 조건 ↔ 케이스
| AC | 인수 조건(출처) | 케이스 |
|---|---|---|
| AC-1 | 장치 오류를 4종으로 분류, 실패해도 가능한 것만 켜고 입장은 막지 않음(FR-04, UX-03) | 기존 TC-477·478·478b, 신규 TC-477g, TC-478k·478l |
| AC-2 | 마이크는 enabled로 즉시 음소거(새 트랙에도 유지), 카메라 끄면 장치 해제·재획득 실패 시 꺼짐 유지(FR-08) | 기존 TC-478c·d, 신규 TC-478j·478n·478p |
| AC-3 | 장치 전환 성공/실패 롤백, 카메라 꺼진 때는 선택만 기억(FR-09) | 기존 TC-478e·f, 신규 TC-478h·478l·478m |
| AC-4 | 백그라운드 종료 트랙 정리·알림(UX-14) | 기존 TC-362·362b, 신규 TC-478o |
| AC-5 | 지원 판정: 보안 컨텍스트·API·모바일·화면공유는 데스크톱만(FR-12, NFR-05) | 기존 TC-477b·c, 신규 TC-477d·e·f·h |
| AC-6 | 영상·음성 협상: 한쪽만 offer, 충돌 양보, 후보·설명 전달, 잘못된 신호 무시(FR-07, FR-20, SEC-07) | 기존 TC-479~479g, 신규 TC-479m·n·o·p·aa·ab·af |
| AC-7 | 수신 트랙 역할 분배·교체(FR-07·09·12) | 신규 TC-479k·479l |
| AC-8 | ICE 재시작: disconnected 4초, failed 3회 제한·복구 시 초기화, 정리(NFR-03) | 기존 TC-479h, 신규 TC-479v·w·ac |
| AC-9 | 경로 판정 보고(NFR-15) | 기존 TC-479i·pathType·pathMetricsAdversarial, 신규 변이 P01~P09로 확인 |
| AC-10 | 네트워크 품질 판정(0.4초·8%·표본 200)(FR-19) | 신규 TC-479r·s·t·u·ag |
| AC-11 | 인원별 송신 상한·화면 1.5Mbps, 협상 후 재적용(NFR-13) | 기존 TC-479c·TC-210, 신규 TC-479x·y·ad |
| AC-12 | 연결 정리·재사용(FR-22), ICE 서버 변환·자격증명 비노출(SEC-09) | 기존 TC-479b·j, 신규 TC-479z·ae |
| AC-13 | 발언 감지: 임계 0.035·켜짐 120ms·꺼짐 700ms·15fps·공유 컨텍스트·정리(FR-10, UX-07) | 기존 TC-476~476i, 신규 TC-476j~476q |

### 4.2 이번 단위 신규 자동 시험(이전 중단 실행분 포함, TC ID 기준)
- `apps/web/src/lib/unit07Media.test.ts` (14): TC-477d·e·f·g·h, TC-478h~p
- `apps/web/src/lib/unit07AudioLevel.test.ts` (8): TC-476h~o(기존 TC-476 파일과 번호 구간 공유, 행은 test-cases.md 기준)
- `apps/web/src/lib/unit07AudioLevel.hook.test.ts` (2, 신규 파일, hookHarness 사용): TC-476p·q
- `apps/web/src/media/unit07Transport.test.ts` (23): TC-479k~479z, 479aa~479ag
- 이번 호출에서 새로 쓴 것: TC-477f·g·h, TC-478p, TC-476p·q, TC-479ad·ae·af·ag(11개). 나머지는 이전 중단 실행이 남긴 것을 검증·변이 확인 후 인계(TC-476o·479aa·ab·ac는 test-cases.md 행이 없어 이번에 추가).
- 번호: grep으로 `TC-477f~h`, `TC-478p`, `TC-476p·q`, `TC-479ad~ag` 미사용 확인 후 사용. 한글 문구는 시험 제목·설명에만 있고 제품 문구 리터럴 하드코딩은 없음(TC-213 통과).

### 4.3 실행 결과
- unit-07 관련 11파일(`src/media/*`, `lib/media|audioLevel|localMedia|unit07*`): **87 통과, 실패 0**. 그중 이번 단위 소유 신규 4파일 47 통과.
- 이전 결함 가능성 점검: `it.fails` 필요한 결함은 발견하지 못했다(6절).
- 웹 전체 `npx vitest run --root apps/web`: 마지막 실행 **46파일 통과 / 1파일 실패(`pages/room.test.ts` TC-466k)**. 실패는 unit-09 테스터가 `components/Room.tsx`를 변이 중일 때의 상태(작업 트리에 `M apps/web/src/pages/Room.tsx`가 보임; 이전 실행에서는 `RoomPage.tsx` 변이로 `roomPage.hook.test.ts` TC-516b 실패). 이 단위 파일과 무관함을 `git status`로 확인. unit-07 파일만 돌리면 87/87.

### 4.4 변이 시험(원본 불변 복사본 기준, 3개 라운드 + 보강 후 최종 재실행)
- 변이 총 약 199종(1라운드 76종, 2라운드 30종 중 4종은 1라운드 보강 확인용 중복, 3라운드(독립 설계) 93종; 대상은 media.ts·audioLevel.ts·MeshTransport.ts·pathType.ts).
- 1라운드: 기존+이전 중단 실행의 보강 시험 전, 생존분이 있어 보강(TC-479aa·ab·ac, TC-476o 등; 결과 로그는 이번 호출에서 이어서 확인: N15·N23·N29·N30 검출).
- 이번 호출 재실행 생존 3종(M05 iPhone 토큰, T19, T31) + 2라운드 N28 → M05는 TC-477f로 검출. 3라운드(독립 설계, 오류 이름 5종·window 가드·구독 해제·재시도 횟수·타이머 간격·콜백 해제 6종·품질 판정 합산·경로 후보 규칙 등) 생존 23종 → 12종은 시험 보강(TC-477g·h, 478p, 476p·q, 479ad·ae·af·ag)으로 검출, 나머지는 등가.
- **등가(동작을 바꾸지 못하는) 변이로 제외한 10종과 사유**: T19(`addIceCandidate` 오류의 `ignoreOffer` 무시: 안쪽 throw를 바깥 catch가 어차피 삼킴), T31(handleSignal `closed` 가드: close가 peers를 비우고 addPeer도 `closed`를 확인), S06·S09·S10(probePath/restartPeer의 `closed`·`peers.has` 이중 가드: close·removePeer가 타이머를 먼저 정리), S14(`Math.max(1,n)`: 0·1명 모두 같은 최상위 등급), P09(classifyPath의 `id` 문자열 검사: 문자열 아닌 id는 조회되지 않음), B10·B11(`!speaking &&`/`speaking &&` 조건: 멱등 할당), N28(`rms > 0.035`→`>=`: 바이트 샘플로 정확히 0.035가 되는 입력이 없음 — 128 기준 1/128 단위라 0.03125·0.0390625만 가능).
- 최종 재실행(보강 후 전체 4개 스펙): 변이 약 199종 중 **검출 189, 생존 10(전부 위 등가)**. 원복(복사본이라 불필요)과 `git diff --stat`로 제품 파일 3군데 diff 없음 확인.

## 5. 커버리지
- 기능 기준: AC-1~13 모두 실행 근거 있음. 라인 커버리지 수치는 측정하지 않았다(미측정).
- 미커버: 실제 브라우저 API 동작(가짜 객체), SDP 실제 내용·m-line 순서 일치(실제 협상은 e2e IT-01·08·17·21 소유, 재실행 미검증), iOS Safari 자동재생·ICE 동작(미검증), AudioContext의 실제 resume 정책.

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 | 심각도 | 상태 | 조치 |
|----|------|------|--------|------|------|
| (없음) | 이번 변이·동작 시험으로 확정된 제품 결함은 없다 | - | - | - | - |
| OBS-001 | 시그널 수신 시 모르는 발신자 ID면 연결을 새로 만든다(응답하는 쪽 설계상 필요). 퇴장 처리(`removePeer`) 뒤에 같은 ID의 늦은 신호가 오면 연결이 되살아나 `close()`까지 남는다. Socket.IO가 같은 소켓에서 순서를 보장하고 서버가 같은 방 참가자만 중계하므로 정상 경로에서는 발생하기 어렵다(미재현) | `removePeer('a')` 후 `handleSignal('a', {candidate})`로 코드 확인(재현 시험은 쓰지 않음) | Low(관찰) | Deferred | 필요 시 `MeetingController`가 알려진 참가자만 전달하도록 제안(범위 밖 변경이라 미수행) |
| OBS-002 | `useAudioLevel`의 공유 `AudioContext`는 닫히지 않는다(탭 수명 동안 1개 유지) — 의도된 설계로 보이나 문서 근거 미확인 | 코드 정독 | Low(관찰) | Deferred | - |
| OBS-003 | 시험 약점(수정 안 함): `e2e/webRetro.spec.ts` IT-52는 `.click().catch(() => undefined)`로 재시도 버튼 클릭 실패를 삼킨다. 이어지는 단언이 실패하므로 결함은 가려지지 않지만 원인 메시지가 흐려진다. 다른 단위와 공유하는 파일이라 건드리지 않음 | 정독 | Low | Deferred | - |
- 위 외 결함 없음. 근거: 11파일 87통과, 변이 199종 중 189 검출·10 등가.

## 7. 테스트 환경 정리(Teardown) — 규칙 K
- 생성한 임시 아티팩트: `.harness-tmp/mut_06_unit07/`(이전 중단 실행이 남긴 하네스·복사본·로그 포함). 그 외 없음(venv·DB·서버 프로세스 없음, 포트 사용 없음).
- 모두 `.harness-tmp/` 하위: [x] 예 / [ ] 아니오
- 정리 완료: 완료 — `.harness-tmp/mut_06_unit07/` 삭제 확인. 다른 단위의 `mut_06_base·head·unit09·unit09r·unit10·11·12`·`probe_06_web`는 손대지 않았다.
- 정리 후 `git status --short`(소유 주석):
```
 M apps/web/src/pages/Room.tsx            # 다른 단위(unit-09 테스터)의 진행 중 변이 — 내 소유 아님
 M docs/05-qa/test-cases.md               # 내 행 추가(TC-476o~q·477f~h·478p·479aa~ag) + 다른 단위 행 포함
 M docs/traceability.md                   # check-docs --gen 재생성(다른 테스터 변경분 포함)
?? apps/web/src/lib/unit07AudioLevel.hook.test.ts   # 내 소유(신규)
?? apps/web/src/lib/unit07AudioLevel.test.ts        # 내 소유(이전 실행분 이어서 완성·린트 수정)
?? apps/web/src/lib/unit07Media.test.ts             # 내 소유
?? apps/web/src/media/unit07Transport.test.ts       # 내 소유
?? docs/harness/units/unit-07-test.md, docs/harness/verify-log_unit-07-test.md   # 내 소유
(그 외 ?? 항목은 다른 단위 소유)
```
- 이 단위가 만든 임시 아티팩트·미추적 잔여물 없음. 작업 중 강제 중단: 없음(이전 호출의 중단 잔여물만 정리).

## 8. 리스크 및 잔존 이슈
- 가짜 객체 기반이라 실제 브라우저 차이(Safari의 `restartIce`·`replaceTrack`·`setLocalDescription()` 암묵 호출 지원)는 미검증. e2e 재실행 미검증. 변이 시험의 등가 판정 10종은 정독 근거(실행으로 입증 불가).
- 후속: 푸시 전 e2e 전체 실행으로 IT-52·59 회귀 확인(오케스트레이터 몫).

## 9. 결론 및 판정
- [ ] PASS
- [x] CONDITIONAL PASS — 조건: 결함 0건, Critical/High 없음. e2e 재실행·타 브라우저는 미검증이며 Low 관찰 3건(OBS-001~003)이 Deferred. 07단계 handoff 가능
- [ ] FAIL
- 게이트 확인: 이 단위 시험 4파일 `eslint` 0건(린트 오류 2건을 이번 호출에서 시험 파일 쪽에서 고침: `react-hooks/rules-of-hooks`·`immutability`), `tsc --noEmit -p apps/web` 0건(TS2322 1건을 시험 쪽에서 수정), `eslint apps/web`·`tsc` 전체 0건, `node scripts/check-docs.mjs` 통과(`--gen` 후). 웹 전체 단위는 타 단위 변이 중 파일 때문에 1건 실패(위 4.3).

## 10. 내부 검증
- 1차: AC-1~13에 케이스 연결, 기대값은 PRD·설계서 수치(0.4초·8%·200개·120/700ms·4초·3회·1.5Mbps/700k/400k)와 코드 상수 비교. 시험 약점 점검으로 변이 생존 확인 → 보강.
- 2차: "이대로 07에 넘겨도 되는가"를 의심해 독립 설계 3라운드 93종을 추가 수행, 생존 23종 중 13종 신규 시험으로 검출·10종 등가 판정. 시험 쪽 결함: 훅 규칙 린트 2건·타입 1건 수정 후 변이 검출력을 다시 확인.
- 검증 로그: `docs/harness/verify-log_unit-07-test.md`

## 공유 문서 갱신 요청
- `docs/harness/traceability.md` 단위테스트 컬럼: FR-04·07·08·09·10·12·19·22, NFR-03·05·13·15, SEC-09, UX-07·14 (unit-07) → `CONDITIONAL PASS (소급 6단계, 신규 시험 47·변이 199종, 결함 0, Low 관찰 3: unit-07-test.md)`
- decisions.md 후보: 웹 소급 단위 결과서 묶음 반영(DEC-023 ④ 후속), OBS-001 수용 여부
