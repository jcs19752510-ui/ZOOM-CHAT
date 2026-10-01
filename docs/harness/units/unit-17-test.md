# 테스트 결과서 — unit-17 (UX-13 인앱 안내 · UX-14 복귀 처리 · UX-15 자동재생 배너)

> 06단계 테스터가 unit-17의 인수 조건(AC-1~8)이 실제 실행으로 증명됐는지 판정하고 07단계로 넘길지 결정하는 문서. 2026-10-01.

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 작업 단위 unit-17 — `lib/inApp.ts`, `components/InAppNotice.tsx`·`CopyLink.tsx`, `state/foreground.ts`·`useForeground.ts`, `MeetingController.onForeground/probe/runForeground/reconcileMedia`, `VideoTile`·`VideoGrid`·`Room.tsx`(자동재생 배너), `RoomPage`·`Lobby`·`PageShell` 최소 수정. 코드 기준 커밋 `f08779d`(PROD).
- 테스트 유형: 단위 (+ 해당 단위가 만든 E2E 경로의 실행 검증과 변이 시험)
- 적용 Tier (Low/Standard/High, ORCHESTRATOR.md 1장 참고): Standard
- 적용 속도 트랙 (L1~L5): L3
- 병렬 실행 정보: 병렬 웨이브 W1에서 실행(동시 단위: unit-15의 6단계). 공유 `apps/web/dist`는 재빌드하지 않고 `--workers=1`로 사용.
- 테스트 목적: AC-1~AC-8을 기대값과 실제값 비교로 증명하고, 핵심 판정 로직이 변이 시험에서 기존 테스트에 잡히는지 확인해 시험의 구멍을 메운다.
- 관련 산출물: `docs/harness/units/unit-17-note.md`, `03-system-design.md`(unit-17), `04-ux-design.md`(SCR-26·27, UX-14, §2.3.4), `decisions.md`(DEC-015, DEC-018 ①②)
- 테스트 수행자(에이전트): 06-unit-tester
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope): AC-1~AC-8 전체, UA 감지 경계, 안내 바 동작·접근성, 자동재생 배너, `decideForeground` 전수 조합, 프로브 분기(`NETWORK`/`NOT_JOINED`/`PARTICIPANT_GONE`/정상), DEC-018 ② 새 소켓 복구 경로, 복귀 이벤트 폭주 시 중복 연결, 회귀(IT-01·03·11·12·19·24 외 meeting/states/ux/a11y/responsive 전체), 변이 시험 31종.
- 제외 범위 (Out-of-Scope) 및 사유: **실기기 iOS Safari·실제 카카오톡/인스타그램/네이버 인앱 브라우저(미검증 — 이 환경에서 불가)**, Firefox/WebKit E2E(미실행, Chromium만), 스크린리더 실음성 확인, 03에 없는 "숨김 시간 임계"(아래 4절 TC-N/A 참조), 서버 코드(unit-17은 서버 무변경).

## 3. 테스트 환경
- 실행 환경: Linux 6.18, Node(저장소 기본), Vitest, Playwright + 사전 설치 Chromium(fake media 플래그), 서버는 E2E 픽스처가 프로세스 내에서 기동(포트 자동 할당, `RECONNECT_GRACE_SEC=20`). 기존 `apps/web/dist`(빌드에 unit-17 문자열 "탭하여 재생" 포함 확인)를 읽기만 함.
- 테스트 데이터: 알려진 인앱·일반 UA 문자열(카카오톡 iOS/Android, 인스타그램, 페이스북, 라인, 네이버, 다음, Chrome/Edge/Firefox/Safari/삼성/iOS Chrome·Firefox·Edge/Android Chrome), 빈·공백·20만 자 UA. 가짜 카메라·마이크. WebSocket 송신 차단·프레임 주입으로 죽은 소켓·`NOT_JOINED` 흉내.
- 전제 조건: 5단계 게이트 확인(note §5): lint·typecheck·테스트 통과 기재, 자체 리뷰 체크리스트 6항목 체크. 이 호출에서도 재실행해 확인(4절 G-1~G-5).
- 변이 시험 환경: `.harness-tmp/mut_06_unit17/`(저장소 사본 + `node_modules` 심볼릭 링크). **사본의 `apps/server/src/http/app.ts` `sendFile`만 `{root}` 형태로 바꿨다**(경로에 `.harness-tmp`가 있으면 Express `sendFile`이 점(.) 디렉터리를 거부해 400 `INVALID_PAYLOAD`가 나기 때문, 환경 문제이며 저장소 원본은 미수정).

## 4. 테스트 케이스 및 결과

### 4.0 게이트 재확인
| ID | 명령 | 실제 결과 | 판정 |
|---|---|---|---|
| G-1 | `npm run lint` | 오류 0(최종 실행) | Pass |
| G-2 | `npm run typecheck` + `tsc -p e2e/tsconfig.json` | 오류 0 | Pass |
| G-3 | `npm test` | shared 16, server 111 + 4 skip, web 53(내 추가분 포함; 추가 전 41) 통과. 중간에 unit-15의 신규 적대 시험 2건이 실패한 시점이 있었으나(동시 작업, unit-15 소유) 최종 실행에서 통과 | Pass |
| G-4 | `npm run check:docs` / `check-docs.mjs --gen` | 점검 통과, 테스트 255개, 미연결 요구 0건 | Pass |
| G-5 | note §5 자체 리뷰 체크리스트 | 6항목 모두 체크, 코드 리뷰에서 빈 `catch` 없음(`resumePlayback`의 `() => undefined`는 의도적 무시, 주석 사유 있음), 새 의존성 없음 | Pass |

> note는 web 단위 테스트를 61개로 적었으나 실제는 41개(DEC-018 ④가 이미 정정). 코드 결함 아님, 문서 숫자 오기.

### 4.1 AC별 케이스(1:1 추적)
| ID | AC | 시나리오 | 실행 절차 | 예상 결과(명세 근거) | 실제 결과 | Pass/Fail | 비고 |
|----|----|----------|-----------|----------------------|-----------|-----------|------|
| TC-360 | AC-1 | 알려진 인앱 UA 10종 판정 | `vitest inApp.test` | 모두 `inApp:true`와 정확한 `app/os` (04 §2.3.4 토큰표) | 10종 일치 | Pass | 기존 |
| TC-360b | AC-1 | 일반 브라우저 12종·빈 문자열 오탐 없음 | 동일 | `inApp:false` | 일치 | Pass | 기존 |
| TC-363 | AC-1 | **(신규)** 대소문자·위치, 공백/`null`/XSS 문자열/이모지/20만 자 UA | `vitest inApp.edge.test` | 카카오·인스타·네이버는 대소문자 무시, `fban` 소문자와 `OnLine/`은 미판정, 비정상 UA는 `{inApp:false, app:null, os:'other'}`, 20만 자 입력 200ms 미만(ReDoS 없음) | 일치 | Pass | 변이 M2·M3·M5c를 잡음 |
| TC-363b | AC-1 | **(신규)** `; wv)`는 Android만, iOS는 `Safari/`·CriOS·FxiOS·EdgiOS 각각이 일반으로 만듦, iPad 카카오, iPadOS 데스크톱 UA | 동일 | 설명대로 판정 | 일치 | Pass | 변이 M4·M5·M5b를 잡음 |
| TC-361 | AC-6 | 비라이브 상태 무동작 | `foreground.test` | `[]` | 일치 | Pass | 기존 |
| TC-361b/c/d | AC-6 | 끊김 인지 시 즉시 재연결, 프로브 전 분기, 프로브 결과별 분기 | 동일 | 03 §4.5 표 | 일치 | Pass | 기존 |
| TC-364 | AC-6 | **(신규)** 5상태×소켓2×프로브4×피어7 = 280 조합 불변식 | `foreground.table.test` | 비라이브 `[]`, 프로브 결과 후 `probe` 없음, 중복 없음, `timeout`→`kickSocket`, `notBound`→`resumeNow`, `ok`→ICE 문제 시만 `restartIce` | 280조합 모두 일치 | Pass | 경계 "숨김 시간 임계"는 아래 TC-N/A |
| TC-362/362b | AC-7 | `LocalMedia.reconcile` | `media.test` | ended만 비움 / 없으면 무변경 | 일치 | Pass | 기존 |
| IT-35 | AC-5 | 거부 → 배너 1개, 높이 ≥44, 탭 후 사라지고 `MAIN` 포커스, 실제 재생 | `mobile-lifecycle` | 명세대로 | 통과 | Pass | 기존 |
| IT-35b | AC-5 | 거부 없으면 배너 없음 | 동일 | `count 0` | 통과 | Pass | 기존 |
| IT-40c | AC-5 | **(신규)** `AbortError`는 배너 없음 | `foreground-extra` | `autoplay-banner` 0개(2.5초 대기) | 통과 | Pass | 변이 E6을 잡음 |
| IT-40g | AC-5, AC-1 | **(신규)** 접근성(4.3) | 동일 | 4.3 표 | 통과 | Pass | |
| IT-35c | AC-1, AC-2 | 인앱 UA 접힘(`data-expanded=false`, ≤130px, 가로 스크롤 없음), 토글, 대기실 닫기→`#lobby-nickname` 포커스, 입장 | 동일 | 명세대로 | 통과 | Pass | 기존 |
| IT-40h | AC-1 | **(신규)** 360×740 대기실에서 접힌 안내가 입장 버튼을 미는 양과 펼침 후 입장 | 동일 | 입장 가능, 밀림 ≤ 안내 높이 | 통과 (아래 DEF-003 관찰) | Pass | |
| IT-35d | AC-3 | 권한 거부 시 강제 펼침, `[✕]`·토글 없음 | 동일 | 명세대로 | 통과 | Pass | 기존 |
| IT-40d | AC-2, AC-3 | **(신규)** 랜딩에서 닫은 뒤 권한 실패 대기실에서 강제 펼침(닫기 없음), `permissionExtra` 한 줄 포함 | 동일 | 04 §2.3.4 "닫음 상태 무시" | 통과 | Pass | 변이 E7을 잡음 |
| IT-40e | AC-3, AC-4 | **(신규)** 복사 대상: 랜딩=origin, 대기실·지원 불가(SCR-20)=`/r/:id`, 안내에 `a`·`target` 없음, SCR-20도 강제 펼침 | 동일 | 명세대로 | 통과 | Pass | 변이 E8을 잡음 |
| IT-36 | AC-6 | 죽은 소켓 → 5초 안 재연결 배너(복귀 문구), 같은 자리 복구 | 동일 | `reconnecting>live`, ≤5000ms, 같은 `peerId`, 호스트 타일 2 | 통과 | Pass | 기존 |
| IT-36b | AC-6 | 정상 연결 복귀 시 배너 없음 | 동일 | `live/poor` 유지 | 통과 | Pass | 기존 |
| IT-36c | AC-6 | 서버가 끊은 뒤 복귀 이벤트 겹침 | 동일 | 같은 자리 복구 | 통과 | Pass | 기존 |
| IT-40i | AC-6 | **(신규)** `pageshow`만(visibilitychange 없이) 와도 5초 안 감지 | 동일 | `reconnecting>live`, ≤5000ms, 같은 `peerId`, 소켓 2개 | 통과 | Pass | 변이 E5b를 잡음(처음 작성본은 자연 복구로 통과해 약했고, 5초 단언을 추가해 보강) |
| IT-40f | AC-7 | **(신규)** 카메라 트랙이 ended(`stop()`)인 채 복귀 → 버튼 꺼짐, `mediaLost` 경고 토스트, 상대에 "카메라 꺼짐" 반영 | 동일 | 명세대로 | 통과 | Pass | 변이 E10·E10b를 잡음. AC-7의 expired `platformNote`는 IT-39가 간접 확인(아래) |
| IT-39 | AC-7, DEC-018 ② | **(신규)** 서버가 자리를 정리(`rooms.leave`)했는데 소켓은 묶인 상태에서 복귀 → `PARTICIPANT_GONE` | 동일 | 재연결 상태에 갇히지 않고 새 소켓 정확히 1개로 expired 화면(`연결이 오래 끊겨 회의에서 나갔습니다`), 추가 소켓 없음(3초 관찰) | 소켓 2개(초기 1 + 복구 1), expired 화면 표시 | Pass | 변이 E1·E1b를 잡음. `platformNote` 본문 포함은 코드 리뷰(`RoomPage.tsx:205`)로 확인, E2E 단언은 없음 |
| IT-40j | 프로브 분기 | **(신규)** 프로브 ack를 `NOT_JOINED`로 주입 | 동일 | 같은 소켓(소켓 수 1)으로 즉시 `room:resume` 송신 | 송신 확인 | Pass | 변이 E11을 잡음 |
| IT-40 | DEC-018 ② 폭주 | **(신규)** 죽은 소켓 + 복귀 이벤트 60회(약 7초, visibility/pageshow 교대) | 동일 | 소켓은 총 2개(초기+복구 1), 같은 `peerId`, 서버 참가자 2명, 복구 후 4초간 추가 소켓 없음, 영상 유지 | 일치 | Pass | 변이 E2·E3·E4를 잡음 |
| IT-40b | 폭주(정상) | **(신규)** 정상 연결에서 이벤트 40회 | 동일 | 소켓 1개 유지, `data-status=live` | 일치 | Pass | |
| TC-N/A | AC-6 | 숨김 시간 임계 전후 | 03·04·코드 검색 | 명세에 숨김 시간 임계가 없음. 구현은 숨김 시간과 무관하게 항상 프로브(코드 `decideForeground`에 시간 입력 없음) | 해당 없음(명세에 없는 항목, 임의 추가 안 함) | N/A | 오케스트레이터가 기대한 항목이면 알려 달라 |

### 4.2 회귀(AC-8) — 기존 dist, `--workers=1`
| 실행 | 결과 |
|---|---|
| 1회차: `meeting` + `states` + `ux` + `a11y`(IT-01~09, 11~19, 23~28 등 24개) | 24 통과. IT-01·03·11·12·19·24 모두 통과(IT-24 첫 영상 418~493ms) |
| 2회차: 위 + `responsive`(26개) | 26 통과 |
| `mobile-lifecycle`(unit-17 원본 7개) 2회 | 7/7 통과 ×2 (최종 18개 묶음 실행에서도 통과) |
| `foreground-extra`(신규 11개) | 11/11 통과(최종 묶음 18개 중 11) |

### 4.3 접근성 점검(④)
| 항목 | 근거 | 판정 |
|---|---|---|
| 안내 바 이름·역할 | `aside[aria-labelledby=inapp-title]`, 제목 비어 있지 않음(IT-40g) | Pass |
| 토글 상태 | `aria-expanded` false/true 전환, `aria-controls=inapp-details`(IT-40g) | Pass |
| `[✕]` 이름 | `aria-label` 존재, 강제 펼침일 때 `[✕]`·토글 없음(IT-35d·40d) | Pass |
| 터치 44px | 360px에서 복사·토글·닫기 높이·너비 ≥44, 자동재생 버튼 높이 ≥44(IT-40g, IT-35) | Pass |
| 키보드 순서 | 복사 → 토글 → 닫기 → 닉네임 입력(IT-40g). 닫으면 포커스가 `#lobby-nickname`(IT-35c) | Pass |
| 자동재생 배너 | `role=status`(IT-35·40g), 키보드 포커스 가능, 탭 후 `main`으로 포커스(IT-35), 360px 가로 스크롤 없음(IT-40g) | Pass |
| `prefers-reduced-motion` | 에뮬레이션 시 버튼 `transition-duration` ≤0.01s(IT-40g) | Pass |
| 스크린리더 실제 낭독 | 미검증. `role=status`가 내용과 함께 새로 삽입되는 방식이라 일부 리더가 낭독하지 않을 수 있음(미확인) | 미검증 |

### 4.4 변이 시험(②) — 31종
> 단위 변이는 `vitest`, 컨트롤러·UI 변이는 별도 빌드한 사본 dist에 E2E를 돌려 판정. 저장소 파일은 수정하지 않음.

단위 수준(15종, 기존 테스트만으로 / 신규 TC-363·363b·364 포함):
| ID | 변이 | 기존 테스트만 | 신규 포함 |
|---|---|---|---|
| M1 | 카카오 패턴 삭제 | 잡음(TC-360) | 잡음 |
| **M2** | `Line` 단어경계 `\b` 삭제 | **생존** | 잡음(TC-363) |
| **M3** | `FBAN` 패턴 대소문자 무시 | **생존** | 잡음(TC-363) |
| M4 | iOS `Safari/` 예외 삭제 | 잡음 | 잡음 |
| **M5** | `; wv)` 판정의 android 조건 삭제 | **생존** | 잡음(TC-363b) |
| **M5b** | iOS `CriOS|FxiOS|EdgiOS` 예외 삭제 | **생존**(Safari/ 토큰이 가려서) | 잡음(TC-363b) |
| M5c | 네이버 패턴 삭제 | 잡음 | 잡음 |
| M6 | `timeout`→`resumeNow` | 잡음(TC-361d) | 잡음 |
| M7 | `notBound`→`kickSocket` | 잡음 | 잡음 |
| M8 | probe/kick 반전 | 잡음(TC-361c) | 잡음 |
| M9 | `disconnected` 미검사(임계 상태 판정) | 잡음 | 잡음 |
| M9b | reconnecting의 resume/connect 반전 | 잡음(TC-361b) | 잡음 |
| M9c | 비라이브 상태 가드 삭제 | 잡음(TC-361) | 잡음 |
| M9d | `ok`일 때 항상 `restartIce` | 잡음 | 잡음 |
| M9e | `reconcileMedia` 선행 삭제 | 잡음 | 잡음 |

E2E 수준(16종, 사본 dist 빌드):
| ID | 변이 | 결과(잡은 시험) |
|---|---|---|
| E1 | `PARTICIPANT_GONE`→`ok` | 잡음: IT-39 |
| E1b | `PARTICIPANT_GONE`→`notBound`(원 설계 `resumeNow`) | 잡음: IT-39 (DEC-018 ② 근거 재현: 같은 소켓 resume은 갇힘) |
| E2 | `NETWORK`→`ok` | 잡음: IT-36, IT-40 |
| E3 | 프로브 대기 3000→30000ms | 잡음: IT-36, IT-40 |
| E4 | `foregroundBusy` 가드 삭제 | 잡음: IT-40 |
| E5 | 합치기 500ms→0 | **생존** — `foregroundBusy` 가드가 같은 일을 하므로 사실상 동등 변이(겹침 방어). 결함으로 보지 않음(DEF-004, Low, 수용) |
| E5b | `pageshow` 리스너 삭제 | 원 시험으로는 **생존**, 수정한 IT-40i가 잡음 |
| E6 | `NotAllowedError` 판별 삭제 | 원 시험 **생존**, IT-40c가 잡음 |
| E7 | 닫은 뒤 강제 펼침도 숨김 | 원 시험 **생존**, IT-40d가 잡음 |
| E8 | 대기실 복사 대상을 origin으로 | 원 시험 **생존**, IT-40e가 잡음 |
| E9 | `kicking` 원인 항상 network | 잡음: IT-36(복귀 문구) |
| E10 | 미디어 상실 알림 삭제 | 원 시험 **생존**, IT-40f가 잡음 |
| E10b | 상실 후 `media:state` 미전송 | 원 시험 **생존**, IT-40f가 잡음 |
| E11 | `NOT_JOINED`→`ok` | 원 시험 **생존**, IT-40j가 잡음 |
| E12 | 배너 `role=status` 제거 | 잡음: IT-35 |
| E13 | 배너 탭 후 포커스 이동 삭제 | 잡음: IT-35 |

요약: 31종 중 원 시험이 놓친 변이는 11건(M2·M3·M5·M5b·E5b·E6·E7·E8·E10·E10b·E11)이며 모두 신규 TC/IT로 잡힌다. 신규 포함해도 남은 생존은 E5 1건(동등 변이)뿐이다.

### 4.5 DEC-018 ② 및 재연결 폭주 점검(⑤)
- **같은 자리 복구**: 죽은 소켓(IT-36·40·40i)은 프로브 `NETWORK`→`kickSocket`→새 소켓 `room:resume`으로 같은 `selfId/peerId`와 서버 참가자 수가 유지됨을 확인. `PARTICIPANT_GONE`(IT-39)은 자리가 이미 정리된 경우라 "같은 자리 복구"가 아니라 **새 소켓 1개로 만료 화면까지 도달**(재연결 상태에 갇히지 않음)함을 확인했고, 원 설계(같은 소켓 `resumeNow`, 변이 E1b)로 바꾸면 IT-39가 실패해 DEC-018 ②의 필요성이 재현됨.
- **폭주 시험**: 이벤트 60회(IT-40) 동안 소켓 총 2개, 정상 연결 40회(IT-40b) 동안 소켓 1개. 복구 후 4초 관찰에서 추가 소켓 없음.
- **코드 리뷰(타이머·리스너)**: `useForeground`는 cleanup에서 두 리스너 제거. `reconnectTimer`는 `disconnect` 핸들러가 설정 전 `clearInterval`, `connect`에서 정리, 상태가 `reconnecting`이 아니면 스스로 해제. `foregroundBusy`는 `finally`에서 해제, 프로브 요청은 3초 타임아웃으로 반드시 끝남. `VideoTile` effect cleanup이 막힌 요소 집합에서 자신을 제거(요소 누수 없음). 힙·타이머 개수를 직접 계측하지는 않았음(코드 리뷰 + 소켓 수 단언 수준, 계측은 미검증).
- 해석만 한 항목(시험 없음): `resumeNow`가 이미 진행 중인 `room:resume`과 겹치면 서버가 두 번째를 `ALREADY_JOINED`로 거부하고 클라이언트는 이를 조용히 무시하므로 무해하다고 판단했으나 직접 재현하지는 않음.

## 5. 커버리지
- 커버리지 지표: AC-1~8 각각에 정상·경계·예외 케이스 대응(위 4.1). 라인 커버리지 도구는 이 프로젝트에 구성돼 있지 않아 수치 없음(미측정). `inApp.ts`·`foreground.ts`는 분기 전부를 케이스·변이로 확인, `MeetingController`의 `onForeground/probe/runForeground/reconcileMedia`는 E2E+변이로 확인(단위 테스트 없음).
- 커버되지 않은 부분과 사유: 실기기 OS 수명주기(iOS 백그라운드 15/30/60초), 실제 인앱 UA 토큰과 메뉴 이름, iOS의 자동재생 거부 조건, 비-Chromium, 스크린리더 낭독, 이벤트 폭주 시 힙·타이머 계측, expired 화면의 `platformNote` 문구가 화면에 실제로 나오는 E2E 단언(코드 리뷰만).

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | **시험 구멍**: 원 시험은 UA 경계 4건(M2·M3·M5·M5b)과 컨트롤러·UI 판정 7건(E5b·E6·E7·E8·E10·E10b·E11)의 변이를 못 잡았음 | 위 4.4 변이 적용 후 기존 시험 실행 → 모두 통과 | Medium | Fixed (시험 추가) | TC-363·363b·364, IT-39·40·40b~40j 추가. 재변이 시 모두 잡힘(E5 동등 변이 제외) |
| DEF-002 | note §5가 web 단위 테스트를 61개로 기재(실제 41개) | `npm test -w @meetlite/web` | Low | Deferred | 코드 결함 아님. DEC-018 ④가 이미 정정 기록. note 수정은 5단계 소유 |
| DEF-003 | 관찰: 360×740 대기실에서 접힌 안내(117px)가 있으면 [회의 입장] 하단이 y≈806으로 첫 화면(740) 밖. 일반 UA는 689 | 인앱 UA로 `/r/:id`를 360×740에서 열고 닉네임 입력 후 버튼 위치 측정 | Low | Deferred | 04 §2.3.4(145행)가 "한 번 스크롤이 필요한 의도적 비용"으로 이미 기록. AC는 높이 ≤130px·입장 비차단이므로 충족. 오케스트레이터가 "밀리지 않음"을 요구사항으로 본다면 5단계 재작업 대상 |
| DEF-004 | 관찰: `useForeground` 500ms 합치기를 없애도 어떤 시험도 실패하지 않음 | 변이 E5 | Low | Deferred | `foregroundBusy`가 동일 목적을 이중 방어하므로 동등 변이로 판단, 시험 추가하지 않음 |
| DEF-005 | 관찰(미확인 추정): iOS "홈 화면에 추가" 독립 실행(PWA) UA는 `Safari/`가 없어 `webview`로 오탐될 수 있음. 이 앱은 PWA가 아니고 오탐해도 안내만 보이며 입장은 막지 않음 | 실기기·UA 실물 없이 일반 지식 기반 추정(재현 못 함) | Low | Deferred | UAT-04에 UA 토큰 확인과 함께 포함 권고 |
| DEF-006 | 관찰: 자동재생 배너 `role=status`가 내용과 함께 새로 삽입돼 일부 스크린리더가 낭독하지 않을 가능성 | 실기기 스크린리더로 확인 필요(미검증) | Low | Deferred | UAT 항목 후보 |

- 제품 코드(`apps/*/src`, `packages/*/src`)에서 재현된 결함은 0건. Critical/High 없음.
- 직접 수정(Fixed) 내역: 제품 코드는 수정하지 않음. 추가한 파일은 시험 3개와 `test-cases.md` 행(7절 참조).

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록: `.harness-tmp/mut_06_unit17/`(변이용 저장소 사본, `node_modules`·`apps/web/node_modules` 심볼릭 링크 포함, 사본 안의 `dist`·`test-results`·`run_mut.py`·`run_e2e_mut.py`·`e2e_mut_result.txt`). 스크래치 디렉터리 외 임시 파일 없음. Playwright 기본 출력 `test-results/`는 저장소가 이미 무시하는 경로.
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예
- 정리(삭제) 완료 여부: 완료(`rm -rf .harness-tmp/mut_06_unit17`; 원본 `node_modules` 보존 확인, 289개 항목). 이 호출이 새로 만든 빈 `.harness-tmp/` 디렉터리는 병렬 단위가 쓸 수 있어 남김(비어 있고 `.gitignore` 대상).
- 정리 후 `git status` 실행 결과 (그대로 첨부; 이 결과서·검증 로그 작성 전 시점):

```
On branch PROD
Your branch is up to date with 'origin/PROD'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   docs/05-qa/test-cases.md

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	apps/web/src/lib/inApp.edge.test.ts
	apps/web/src/state/foreground.table.test.ts
	e2e/foreground-extra.spec.ts

no changes added to commit (use "git add" and/or "git commit -a")
```
- 병렬 실행: 위 항목은 모두 이 단위(unit-17)가 의도해서 추가한 산출물(시험 3개, `test-cases.md` 행 추가분)이며 임시 아티팩트·미추적 잔여물은 없음. unit-15 소유 변경은 이 시점에 이미 `e6d7619`로 커밋돼 목록에 보이지 않음. 이 결과서와 `verify-log_unit-17-test.md`는 작성 후 새 미추적 파일로 추가됨. `docs/traceability.md`는 `--gen`이 생성하지만 최종 시점에 diff 없음. 웨이브 종료 후 전체 트리 점검은 오케스트레이터 소관.
- 이번 테스트 도중 강제 중단(TaskStop 등)이 있었는가: [x] 없음. (변이 시험 첫 시도에서 남은 playwright 프로세스를 내가 직접 종료했고 이후 `.harness-tmp/` 잔여물을 확인·정리함.)

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크(전부 **미검증**): 실제 iOS Safari 백그라운드·화면 잠금 15/30/60초 복귀, 실제 카카오톡·인스타그램·네이버 UA 토큰과 메뉴 문구, iOS 자동재생 거부 발생 조건과 한 번 탭으로 소리까지 재생되는지, 360×740 실폰 주소창 영향, Firefox/WebKit, 스크린리더 낭독, 폭주 시 메모리·타이머 계측.
- **수동 확인 항목(UAT-04/05 연결)**: (1) 인앱 3종(카톡·인스타·네이버)에서 안내가 뜨고 "방법 보기" 메뉴 이름이 실제와 맞는지 (2) 같은 앱에서 권한 거부 시 강제 펼침 문구가 해결에 도움이 되는지 (3) iOS Safari 백그라운드/잠금 후 복귀 시 재연결 배너·같은 자리 복구·카메라 중단 토스트·유예 초과 expired 문구 (4) iOS에서 자동재생 배너 1탭 후 소리까지 나오는지 (5) VoiceOver·TalkBack에서 안내 바와 배너 낭독 (6) 홈 화면 추가(PWA) UA 오탐 여부.
- 후속 조치가 필요한 항목: 오케스트레이터 판단 필요 1건(DEF-003, 입장 버튼 첫 화면 밖 이동을 허용할지). 07단계는 `foreground-extra`의 `IT-40`·`IT-40i`의 시간 단언(5초)과 `mobile-lifecycle`의 IT-36이 부하에 민감할 수 있음을 알고 직렬로 실행할 것.

## 9. 결론 및 판정
- [x] PASS — 다음 단계(07) 진행 가능. 단 실기기 항목은 "미검증"이며 UAT-04·05에서 확인해야 한다. 7절 Teardown 확인 완료.
- [ ] CONDITIONAL PASS
- [ ] FAIL

## 10. 내부 검증 (최소 2회, `verification-log-template.md` 사용)
- 1차 검증 결과 요약: AC 대응·근거 확인, 1차에서 시험 구멍 11건 발견 → 시험 보강. 결과: 보강 후 재판정.
- 2차 검증 결과 요약: 보강 시험 자체의 약점(IT-40i가 자연 복구로 통과) 발견·수정, 재변이 확인, 7절 Teardown 재확인. 결함 0건에서 확정.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-17-test.md`

## 공유 문서 갱신 요청 (병렬 웨이브 규칙: `traceability.md`·`decisions.md`는 직접 수정하지 않음)
- traceability "단위테스트" 컬럼: UX-13 → TC-360, 360b, 363, 363b, IT-35c·35d·40d·40e·40g·40h PASS (실기기 UAT-04 미수행) / UX-14 → TC-361~361d, 362, 362b, 364, IT-36·36b·36c·39·40·40b·40f·40i·40j PASS (UAT-05 미수행) / UX-15 → IT-35·35b·40c·40g PASS (실기기 미검증).
- `docs/05-qa/test-cases.md`는 `check-docs.mjs --gen`으로 이미 갱신됨(TC-363·363b·364, IT-39·40·40b~40j). `docs/traceability.md`는 현재 diff 없음(이미 생성본과 같음).
- 결정 기록 후보: (1) DEF-003 허용 여부 (2) 병렬 웨이브 중 변이 시험용 사본은 `.harness-tmp` 때문에 Express `sendFile`이 막히므로 사본에서만 `{root}` 패치가 필요했음(원본 무영향).
