# 테스트 결과서 — unit-18 coturn 검증·하드닝 (SEC-12, SEC-09, POL-18)

용도: 오케스트레이터가 unit-18의 6단계 판정(FAIL)과 재작업 사항을 확인하는 문서. 작성일 2026-10-01.

## 1. 개요
- 테스트 대상 (모듈/기능/업무단위/전체 시스템 중 명시): 작업 단위 unit-18 — `infra/coturn/turnserver.conf`, `infra/docker-compose.yml`, `.github/workflows/ci.yml`(coturn job), `apps/server/test/{coturnConfig.test.ts, coturnLive.test.ts, turnProbe.ts}` (커밋 a3eb1fc)
- 테스트 유형: 단위 (+ L2 실시간 실측, 독립 변이 시험)
- 적용 Tier: Standard
- 적용 속도 트랙: L4 (보안 설정 변경, 실측까지)
- 병렬 실행 정보: 병렬 웨이브 W0에서 실행(동시에 unit-0, unit-20의 6단계가 돌았다)
- 테스트 목적: 인수 조건(note 6단계 인수 조건 1~6)을 실제 실행으로 증명하고, 시험 자체가 설정 회귀를 잡아내는지 변이로 검증
- 관련 산출물: `docs/harness/units/unit-18-note.md`, `docs/harness/03-system-design.md` §6.3·§8.3, `docs/harness/decisions.md` DEC-008·DEC-016, CLAUDE.md 보안 규칙(TURN)
- 테스트 수행자(에이전트): 06-unit-tester
- 테스트 일시: 2026-10-01

## 2. 테스트 범위 및 제외 범위
- 범위 (In-Scope): L1(TC-330~330d), L2(TC-331~334) 로컬 turnserver 4.6.1·도커 coturn 4.9 양쪽 실행, 설정·compose 변이 39종(×2 실행기), turnProbe.ts 코드 리뷰, ci.yml 문법·논리 검토
- 제외 범위 (Out-of-Scope) 및 사유: GitHub Actions 실제 실행(불가, **미검증**), IPv6 릴레이 L3(샌드박스에 IPv6 없음, **미검증**), 공인 `relay-ip` 환경(**미검증**), `max-bps` 값의 적정성(사용자 결정 사항). `actionlint`는 없고 설치하지 않았다(수동 + PyYAML 파싱)

## 3. 테스트 환경
- 실행 환경: Linux 6.18 샌드박스, Node 22, vitest 5.0.3, 로컬 `turnserver` 4.6.1, Docker 29.6.2(데몬 `dockerd --iptables=false --bridge=none`이 이미 실행 중이었다), 이미지 `mirror.gcr.io/coturn/coturn:4.9`(compose 이미지 4.9와 같은 이미지 ID 254a7e19f233)
- 테스트 데이터: 저장소 실제 `turnserver.conf`, 변이용 복사본은 `.harness-tmp/mut_06_unit18/w_<변이>/`(tests·infra만 복사, node_modules는 심볼릭 링크)
- 전제 조건: 포트 34790(UDP), 49500~49560 비점유. 다른 단위의 coturn 시험이 동시에 돌지 않을 것(DEF-002 참고)

## 4. 테스트 케이스 및 결과

### 4-1. 인수 조건 추적 및 직접 실행 결과
| ID | 시나리오(인수 조건) | 실행 절차 | 예상 결과 | 실제 결과 | Pass/Fail | 비고 |
|----|---------------------|-----------|-----------|-----------|-----------|------|
| AC-1 | `npm test`에서 TC-330~330d 통과, L2 4건 skipped | `npm test` (verbose는 `npx vitest run --root apps/server test/coturn --reporter=verbose`) | L1 4건 통과, L2 4건 `↓` skipped | server `Tests 96 passed / 4 skipped`, web 14 passed. verbose: TC-330/330b/330c/330d `✓`, TC-331~334 `↓` | **PASS** | 기본 실행시간 증가 0.3초 미만 |
| TC-330 | 필수 옵션 8종 존재, 금지 옵션 6종 부재 | 위와 동일 | 통과 | `✓` | **PASS** | 변이 M3·M5·M17·M23~27·M29·M36·M37·M39로 탐지력 확인 |
| TC-330b | deny 목록에 필수 13개 대역 포함 | 위와 동일 | 통과 | `✓` | **PASS** | 변이 M2·M4·M8~10·M12~15·M18~20·M31·M35로 확인 |
| TC-330c | `::`로 시작하는 deny 범위 없음 | 위와 동일 | 통과 | `✓` | **PASS** | M1·M21로 탐지 확인(아래 한계 참조) |
| TC-330d | compose 이미지 ≥4.9·태그 고정·로그 로테이션 | 위와 동일 | 통과 | `✓` | **PASS** | M6·M7·M28·M38로 확인, M32(4.10)는 정당하게 통과 |
| TC-331 | 공인 IPv4 허용(양성 대조군) | `COTURN_LIVE=1 REQUIRE_COTURN=1 COTURN_RUNNER=local\|docker` 로 `npx vitest run --root apps/server test/coturn` | 203.0.113.5, 8.8.8.8 허용 | 로컬 4.6.1·도커 4.9 모두 `공인: 203.0.113.5=허용 8.8.8.8=허용` | **PASS** | |
| TC-332 | 사설·루프백·링크로컬·CGNAT·벤치마크·멀티캐스트·0/8 9종 403 | 위와 동일 | 전부 403 | 양쪽 `10.1.2.3=403 172.16.5.5=403 192.168.1.1=403 127.0.0.1=403 169.254.169.254=403 100.64.0.1=403 198.18.0.1=403 224.0.0.1=403 0.0.0.1=403` | **PASS** | |
| TC-333 | IPv4-mapped·`::1` 비성공(403/443) | 위와 동일 | ok=false, 코드 403 또는 443 | 양쪽 `::ffff:10.1.2.3=443 ::ffff:127.0.0.1=443 ::ffff:203.0.113.5=443 ::1=443` | **PASS** | 443은 주소 패밀리 불일치(deny 목록 이전)라 `::ffff` 줄 자체의 유효성은 증명되지 않음(L3 미검증) |
| TC-334 | user-quota 12+1번째 486 | 위와 동일 | 12 성공, 13번째 486 | 양쪽 `quota: 성공 12건, 마지막={"ok":false,"code":486}` | **PASS** | 경계값(12/13) 확인 |
| AC-2 | 도구가 없으면 조용한 skip 없이 실패 | 코드 리뷰: `REQUIRE_COTURN=1`이면 beforeAll에서 throw, `describe.skipIf`는 require 시 skip하지 않음 | 실패 | 코드로 확인(도구 부재 상황은 이 샌드박스에서 재현하지 않음) | **PASS(코드 리뷰만)** | 실행 재현 안 함 |
| AC-3 | 두 실행기 같은 결과 | 위 TC-331~334를 local·docker 각각 실행 | 같음 | 위 표와 같음(`[coturn L2 local 4.6.1]`, `[coturn L2 docker mirror.gcr.io/coturn/coturn:4.9]` 출력) | **PASS** | |
| AC-4 | `::-::1` 복원 시 TC-330c·TC-331 실패 | 변이 M1 | 두 건 실패 | L1 TC-330b·TC-330c, L2 TC-331 실패(양쪽 실행기) | **PASS** | |
| AC-5 | 이미지 `latest`/4.8로 바꾸면 TC-330d 실패 | 변이 M6(4.6)·M7(latest)·M38(태그 없음) | 실패 | 모두 TC-330d 실패 | **PASS** | 4.8 자체는 시험하지 않았으나 4.6으로 같은 경로 확인 |
| AC-6 | IT-21/22(`e2e/turn.spec.ts`) 무변경 | `git show --stat a3eb1fc` | e2e 변경 없음 | 커밋 목록에 e2e 파일 없음 | **PASS** | |
| AC-7 | `check:docs`(note가 문서 갱신 필요로 남김) | `grep TC-33 docs/05-qa/test-cases.md`, `npm run check:docs` | TC-330~334 행 존재, coturn 관련 불일치 없음 | 행 176~183 존재. `check:docs`는 unit-0의 TC-305 계열 등 **다른 단위의 미완성 불일치**로 실패 중(SEC-10·UX-01·UX-03·UX-10 등). unit-18 관련(TC-330~334, SEC-12) 불일치는 출력에 없음 | **PASS(unit-18 범위)** | 전체 `check:docs` 실패는 unit-0 소속 작업 중 변경분 때문. 이 단위가 만든 것 아님 |

### 4-2. 독립 변이 시험 (임시 복사본, 저장소 파일 무수정)
방법: `.harness-tmp/mut_06_unit18/w_<이름>/`에 tests·conf·compose를 복사하고 sed로 망가뜨린 뒤 `COTURN_LIVE=1 REQUIRE_COTURN=1`로 L1+L2를 local·docker 양쪽에서 실행했다. 기준선(변이 없음)은 8/8 통과.

| 변이 | 내용 | L1 | L2 | 판정 |
|---|---|---|---|---|
| M1 | `::1-::1` → `::-::1` (D-1 재현) | 330b·330c 실패 | 331 실패 | 탐지 |
| M21 | `denied-peer-ip=::-::` 추가 | 330c 실패 | 331 실패 | 탐지 |
| M33 | `0:0:0:0:0:0:0:0-::1` 줄 추가(::1-::1 유지) | **통과** | 331 실패 | L2만 탐지(L1 정규식 우회, 아래 한계) |
| M34 | `::0-::1` 줄 추가 | **통과** | 331 실패 | L2만 탐지 |
| M2 | `::ffff` 줄 삭제 | 330b 실패 | 통과 | L1만 탐지(L3 미검증 한계와 일치) |
| M31 | `::ffff` 범위 축소 | 330b 실패 | 통과 | L1만 탐지 |
| M3 | `no-multicast-peers` 삭제 | 330 실패 | 통과 | L1만(224/4 deny가 중복 방어) |
| M4 / M8 / M10 / M13 / M14 / M15 | 10/8, 172.16/12, 100.64/10, 169.254/16, 192.168/16, 198.18/15 줄 삭제 | 330b 실패 | 332 실패 | 양쪽 탐지 |
| M12 | 127/8 줄 삭제 | 330b 실패 | 통과 | L1만(coturn 내장 루프백 차단이 방어) |
| M9 | 224/4 줄 삭제 | 330b 실패 | 통과 | L1만(`no-multicast-peers`가 방어) |
| M19 / M20 / M35 | fc00::/7, ff00::/8, fe80::/10 줄 삭제 | 330b 실패 | 통과 | L1만(IPv6 릴레이 L3 미검증) |
| M18 | denied-peer-ip 전부 삭제 | 330b 실패 | 332 실패 | 양쪽 탐지 |
| **M11** | **0.0.0.0/8 줄 삭제** | **통과** | **통과** | **미탐지**(DEF-003) |
| **M30** | **192.0.0.0/24 줄 삭제** | **통과** | **통과** | **미탐지**(DEF-003) |
| M5 | `use-auth-secret` 삭제 | 330 실패 | 통과 | L1만(L2는 명령행 `--static-auth-secret`이 인증을 켜므로 실제 동작 차이 없음 → 정당) |
| M23 / M24 / M36 | `static-auth-secret=`, `user=`, `no-auth` 추가 | 330 실패 | 통과(M27·M36은 coturn이 설정 오류로 기동 실패해 스위트 실패: `-a and -z options cannot be used together`) | L1 탐지 |
| M22 / M29 | `allowed-peer-ip=10/8` 추가, `allow-loopback-peers` 추가 | 330 실패 | M22는 332 실패, M29는 통과 | 탐지 |
| M25 / M26 / M37 / M39 | `no-cli`, `fingerprint`, `total-quota`, `stale-nonce` 삭제 | 330 실패 | 통과 | L1 탐지 |
| M16 | `user-quota=13` | 통과 | 334 실패 | L2 탐지(L1은 값 미검사) |
| M17 | `user-quota` 삭제 | 330 실패 | 334 실패 | 양쪽 탐지 |
| M6 / M7 / M38 | 이미지 4.6 / latest / 태그 없음 | 330d 실패 | 통과 | L1 탐지 |
| M28 | compose `logging` 블록 삭제 | 330d 실패 | 통과 | L1 탐지 |
| M32 | 이미지 `4.10` | 통과 | 통과 | 정당한 통과(4.10 ≥ 4.9, 오탐 없음) |

요약: 39종(기준선 제외) 중 37종은 L1·L2 중 하나 이상이 잡았다. 미탐지는 M11·M30 2종(0.0.0.0/8, 192.0.0.0/24 줄 삭제)이다. 두 줄은 설계서 6.3의 L1 필수 목록에 없어 의도적 범위 밖이고 coturn 내장 규칙이 방어하는 것으로 보이나 **확인하지 않았다**(L2 0.0.0.1=403은 줄 삭제 후에도 유지됨을 관측만 했다). 심각도 Low.

### 4-3. 정적 리뷰 결과 (④⑤)
- ④ `turnProbe.ts`/`coturnLive.test.ts` 리뷰
  - 소켓 정리: `hello()`·`permission()`·quota 루프 모두 `finally close()`로 닫는다. 타임아웃 시에도 호출 측 finally가 close한다(소켓 누수 없음). 정상.
  - 타임아웃 시 `waiters`에서 해당 대기자를 제거하지 않아, 늦게 온 응답이 다음 요청의 대기자를 소비할 수 있다(txid 대조 없음). 현재 호출 패턴(타임아웃되면 즉시 예외로 중단)에서는 영향 없음. Low, 제안.
  - **포트·컨테이너 이름 고정(34790, 49500~49560, `meetlite-coturn-livetest`)**: 병렬 실행 시 충돌한다. 실제로 L2를 두 개 동시에 실행해 재현했다(DEF-002). 기동 대기 루프는 `hello()`가 성공하면 `proc.exitCode`를 확인하지 않고 반환하므로 **자기 프로세스가 포트 충돌로 죽었는데 남의 인스턴스에 붙어도 감지하지 못한다**. 그리고 먼저 끝난 실행의 `afterAll`(`docker rm -f` 또는 SIGKILL)이 다른 실행의 서버를 죽인다. 실패 방향은 fail(거짓 PASS 아님)이다.
  - IPv6 파서 `ipv6ToBytes`: `::ffff:a.b.c.d`와 압축 표기를 처리. 잘못된 입력은 예외. 시험에서 사용한 4개 주소로 동작 확인. 임의 입력 퍼저 검증은 하지 않았다.
- ⑤ `.github/workflows/ci.yml` coturn job — **구문 오류(DEF-001)**
  - 45행 `- run: docker pull "$(sed -n 's/^ *image: *//p' ... )"`에서 plain 스칼라 안에 `image: `(콜론+공백)가 있어 YAML 매핑 값 오류가 난다. PyYAML 실측: `ScannerError: mapping values are not allowed here  in ".github/workflows/ci.yml", line 45, column 47`. 직전 커밋(ac39075)의 ci.yml은 같은 방식으로 파싱돼 정상(jobs verify, e2e)이었다. 즉 이 단위가 **워크플로 파일 전체를 무효로 만들어 verify·e2e까지 실행되지 않게 한다**. GitHub 파서는 YAML 1.2지만 plain 스칼라 내 `: ` 금지는 동일하다고 판단하나 GitHub에서의 실제 동작은 **미검증**이다.
  - 수정안(임시 복사본에서 파싱 성공 확인): `run: |` 블록 스칼라로 바꾸고 다음 줄에 명령을 둔다. 저장소 파일은 수정하지 않았다.
  - 논리: `needs: verify`, checkout/setup-node 버전, `COTURN_RUNNER=docker` + `REQUIRE_COTURN=1`, `--network host`(ubuntu-latest에서 지원)는 타당해 보인다. docker pull이 `sed ... | head -1`로 compose 첫 `image:` 줄을 가져오는 것은 `coturnLive.test.ts`의 정규식(첫 `image:`)과 같은 방식이라 일관된다. Docker Hub 익명 pull 한도, job 타임아웃 미지정은 Low 위험. **GitHub 실제 실행은 미검증.**
  - compose: PyYAML 파싱 정상(`logging` json-file, max-size 10m, max-file 3), `docker compose config -q` 종료 코드 0.

## 5. 커버리지
- 커버리지 지표: 인수 조건 AC-1~AC-7 전부 1:1 대응(AC-2는 코드 리뷰로만). TC 8건(L1 4, L2 4)이 로컬·도커 양쪽 통과. 라인 커버리지 측정은 하지 않았다(설정·프로토콜 시험이라 해당 지표가 부적합).
- 커버되지 않은 부분과 사유: IPv6 릴레이 L3, `::ffff` deny 줄 자체의 유효성, 공인 `relay-ip`, GitHub 실제 실행, `REQUIRE_COTURN=1` 도구 부재 실패 경로의 실행 재현, 0.0.0.0/8·192.0.0.0/24 삭제 탐지

## 6. 결함(Defect) 목록
| ID | 설명 | 재현 절차 | 심각도 | 상태 | 조치 내용 |
|----|------|-----------|--------|------|-----------|
| DEF-001 | `.github/workflows/ci.yml` 45행 YAML 구문 오류. 워크플로 전체(verify·e2e·coturn)가 무효가 될 수 있음 | `python3 -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'))"` → `mapping values are not allowed here ... line 45, column 47` (ac39075 시점 파일은 정상 파싱) | **High** | **Open** | 5단계로 반려. 수정안: `- run: |` 뒤 다음 줄에 `docker pull "$(sed -n 's/^ *image: *//p' infra/docker-compose.yml \| head -1)"`. 복사본에서 파싱 성공 확인. 수정 후 파싱 검증을 5단계 게이트에 넣을 것(원인이 이 단위 밖에 있을 가능성 없음, 이 단위 변경분) |
| DEF-002 | L2가 고정 포트(34790·49500~49560)·고정 컨테이너 이름·고정 사용자 `quota`를 써 동시 실행 시 충돌(상호 서버 종료·쿼터 간섭). 기동 대기가 자기 프로세스의 조기 종료를 놓침 | 같은 명령 `COTURN_LIVE=1 REQUIRE_COTURN=1 COTURN_RUNNER=local npx vitest run --root apps/server test/coturnLive` 를 동시에 2개 실행 → 양쪽 TC-334 실패(`expected { ok: true } to deeply equal { ok: false, code: 486 }`, `expected false to be true`) | Low | Deferred | 현재 CI·단독 실행에서는 문제 없음, 거짓 PASS 아님(fail 방향). 제안: 임의 포트·컨테이너 이름에 PID 사용, `hello()` 성공 후에도 `proc.exitCode` 확인, 사용자 id에 PID 포함. 웨이브 병렬 실행에서 L2는 직렬화할 것 |
| DEF-003 | 시험 구멍: 0.0.0.0/8, 192.0.0.0/24 deny 줄 삭제를 L1·L2 모두 못 잡음 | 변이 M11·M30(sed로 해당 줄 삭제) → 8/8 통과 | Low | Deferred | 설계서 L1 필수 목록에 없는 대역. L1 `required`에 두 대역 추가를 제안(코드 수정은 5단계). 내장 차단 여부는 미확인 |
| DEF-004 | L1 TC-330c 정규식(`/^::(-\|$)/`)이 `0:0:0:0:0:0:0:0-…`, `::0-…` 같은 동치 표기를 놓침. L2 TC-331이 잡으므로 방어는 유지 | 변이 M33·M34 → L1 통과, L2 TC-331 실패 | Low | Deferred | L2가 실행되는 CI coturn job에서 방어됨. 제안: 정규화 후 비교 |

## 7. 테스트 환경 정리(Teardown) 확인 — 규칙 K
- 이번 테스트에서 생성한 임시 아티팩트 목록: `.harness-tmp/mut_06_unit18/`(변이 복사본 w_*, run.sh, 출력 로그). 도커 컨테이너 `meetlite-coturn-livetest`(테스트가 자동 생성·삭제). 로컬 turnserver 프로세스(테스트가 자동 생성·종료)
- 위 아티팩트를 전부 `.harness-tmp/` 하위에서만 생성했는가 (규칙 K 1번): [x] 예
- 정리(삭제) 완료 여부: 완료. `.harness-tmp/mut_06_unit18/` 삭제, `pgrep turnserver` 결과 없음, `docker ps -a`가 빈 목록. `.harness-tmp/wt_06_unit0/`는 unit-0(동시 실행 중인 다른 단위) 소유라 건드리지 않았다. dockerd는 내가 띄운 것이 아니라 이미 실행 중이었으므로 그대로 둔다
- 정리 후 `git status` 실행 결과(그대로 첨부, 보고서 2건 작성 직전 시점):
```
 M apps/server/test/config.test.ts
 M packages/shared/src/schemas.test.ts
?? apps/web/src/strings.test.ts
?? e2e/legalfooter.spec.ts
```
  (이후 이 단위 산출물 `docs/harness/units/unit-18-test.md`, `docs/harness/verify-log_unit-18-test.md` 2건만 추가된다. 위 4건은 unit-0 소속 진행 중 변경분이다.)
- 병렬 실행 판정: 위 4건은 unit-0 소유(config/schemas/strings 테스트, legalfooter e2e)이며 이 단위가 만든 임시 아티팩트·미추적 잔여물은 없다. 웨이브 종료 후 전체 트리 점검은 오케스트레이터 몫.
- 강제 중단: [x] 없음
- 이 단위는 제품 코드·인프라·CI 파일을 수정하지 않았다(`git diff -- infra apps/server/src .github` 출력 없음).

## 8. 리스크 및 잔존 이슈
- 이번 테스트로 커버되지 않는 알려진 리스크: IPv6 릴레이(L3)와 `::ffff` deny 줄 유효성 미검증, 공인 relay-ip·GitHub 실행 미검증, `max-bps`(12Mbps vs 1.5Mbps) 사용자 확인 대기, 4.9 이외 coturn 버전·설정 포맷 변화
- 후속 조치가 필요한 항목: **DEF-001 수정(필수)**, DEF-002~004는 제안 수준. 이후 GitHub에서 coturn job의 첫 실행 결과 확인

## 9. 결론 및 판정
- [ ] PASS
- [ ] CONDITIONAL PASS
- [x] FAIL — 사유: DEF-001(High) ci.yml 구문 오류로 워크플로 전체가 무효화될 수 있다. 재작업 요청: 45행을 블록 스칼라(`run: |`)로 바꾸고 `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`로 파싱 검증한 뒤 06 재검증(해당 항목만 재확인하면 됨). 나머지 L1·L2·변이 시험은 통과했다.

## 10. 내부 검증 (최소 2회)
- 1차 검증 결과 요약: 인수 조건 AC-1~7이 모두 케이스에 대응하고, 기대 결과가 설계서 6.3과 note 인수 조건에 근거함을 확인. 1차에서 TC 전부 통과였으나 CI 파일을 파싱해 보니 DEF-001이 발견돼 판정을 FAIL로 했다.
- 2차 검증 결과 요약: "통과했다고 07로 넘겨도 되는가"를 의심해 변이를 확대(39종)했고 시험 구멍 3건(DEF-002~004, Low)을 찾았다. 변이 `no-auth`가 스위트 실패(coturn 기동 실패)로 나타나 집계 스크립트가 L2 열을 비워 둔 것을 출력 원문에서 확인·보정했다.
- 검증 로그 파일 경로: `docs/harness/verify-log_unit-18-test.md`

## 공유 문서 갱신 요청
- `docs/harness/traceability.md`: SEC-12 단위테스트 컬럼 = "unit-18 06단계 FAIL(DEF-001 ci.yml 구문 오류 High, 재작업 대기). L1·L2(로컬 4.6.1·도커 4.9)·변이 39종 실측은 통과". 직접 수정하지 않았다.
- `docs/harness/decisions.md`: DEF-001 해소 전까지 CI를 신뢰하지 말 것(verify·e2e도 영향 가능). 수정 후 YAML 파싱 검증을 게이트에 포함하는 방안 제안.
