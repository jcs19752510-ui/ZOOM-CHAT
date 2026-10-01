# unit-18 구현 노트 — coturn 검증·하드닝 (SEC-12, POL-18의 coturn 로그 설정)

용도: 6단계 테스터와 오케스트레이터가 unit-18의 범위·편차·인수 조건·실측 근거를 확인하는 문서. 작성일 2026-10-01.

- 속도 트랙: **L4** (보안 설정 변경, 6단계가 실측까지 확인)
- 병렬 실행: 웨이브 W0, 동시에 unit-0, unit-20이 실행 중이었다(파일 교집합 없음).
- git commit·push 하지 않음.

## 구현 범위
- `infra/coturn/turnserver.conf`: `denied-peer-ip=::1-::1`(오케스트레이터가 선행 수정한 D-1 수정)을 유지. 주석만 정정: `max-bps` 단위(바이트/초, 1500000 = 세션당 약 12Mbps), `bps-capacity=0` 의미, `simple-log`가 로그 최소화 옵션이 아니라 파일명 옵션이라는 사실, "전체 대역폭 상한"이라던 `total-quota` 주석 정정. **옵션 값은 변경하지 않았다.**
- `infra/docker-compose.yml`: coturn 서비스에 `logging: json-file, max-size 10m, max-file 3` (03 6.4 지정, POL-18).
- `.github/workflows/ci.yml`: 신규 `coturn` job(`needs: verify`, checkout@v5/setup-node@v5 유지, 기존 job 무변경). compose 이미지를 pull해 `COTURN_LIVE=1 REQUIRE_COTURN=1 COTURN_RUNNER=docker`로 L1+L2를 실행한다(도구 없으면 실패). 이 job은 **GitHub에서 실행해 보지 못했다(미검증)**; 같은 명령을 로컬 도커로 실행해 통과를 확인했다.
- 신규 테스트(`apps/server/test/`):
  - `turnProbe.ts`: `node:dgram`+`node:crypto` 최소 TURN 클라이언트(Allocate, CreatePermission, 장기 자격증명 MESSAGE-INTEGRITY, IPv4/IPv6 XOR-PEER-ADDRESS). 새 의존성 없음.
  - `coturnConfig.test.ts`(L1, 항상 실행): TC-330(필수 옵션·금지 옵션), TC-330b(deny 대역 포함), TC-330c(`::`로 시작하는 deny 범위 금지 — `::1-::1`, `::ffff:...`는 허용 줄), TC-330d(compose 이미지 태그 X.Y ≥ 4.9, `latest` 불가, 로그 로테이션).
  - `coturnLive.test.ts`(L2, `COTURN_LIVE=1`일 때만): TC-331 양성 대조군, TC-332 사설·루프백 등 403, TC-333 IPv4-mapped 비성공(403/443), TC-334 user-quota 12+1번째 486. 테스트 이름에 `[SEC-12,SEC-09]`.
  - 실행기: `COTURN_RUNNER=local|docker`(기본: PATH의 `turnserver`, 없으면 docker `--network host`), `COTURN_IMAGE`로 이미지 덮어쓰기, `REQUIRE_COTURN=1`이면 도구 없을 때 skip 대신 실패.

## 설계서 대비 편차
1. 파일명: 지시의 `coturnConfig.ts`/`coturnLive.ts`는 vitest 기본 include에 잡히지 않아 `*.test.ts`로 지었다(`turnProbe.ts`만 헬퍼라 그대로).
2. L1 TC를 4개 `it`로 나눠 TC-330/330b/330c/330d를 붙였다(design은 TC-330 하나). `check:docs`가 같은 ID 중복을 실패로 보기 때문이다. 문서 쪽 TC 표를 맞춰야 한다(아래 갱신 요청).
3. `max-bps` 값: 의도 확인 불가(사용자 질문 대상). 보수적으로 **값 유지**하고 주석에 단위·환산·미변경 사유를 남겼다. 1.5Mbps로 낮출지는 사용자 결정 사항이다.
4. L2는 L2 상 로컬 `--min-port/--max-port`(49500~49560)와 포트 34790을 덮어쓴다(e2e의 34780, 49300대와 충돌 방지). 설정 파일 자체는 수정 없이 `-c`로 사용.
5. 3단계 6.3 표 중 `::-::` 변형 등 다른 변이는 자동화하지 않았다. 대신 `::-::1`로 되돌리는 변이 시험을 수동으로 수행해 L1·L2 양쪽이 실패함을 확인했다(아래).

## 실측 결과 (L2, 저장소 실제 설정 파일 사용)

| 실행기 | 공인 IPv4(203.0.113.5, 8.8.8.8) | 사설·루프백·링크로컬·CGNAT·멀티캐스트 등 IPv4 9종 | IPv4-mapped·`::1` | quota(12+1) | 결과 |
|---|---|---|---|---|---|
| 로컬 turnserver 4.6.1 | 허용 | 전부 403 | 전부 443 | 12 성공, 13번째 486 | 4/4 통과 |
| 도커 `mirror.gcr.io/coturn/coturn:4.9`(compose 이미지 4.9와 동일 이미지) | 허용 | 전부 403 | 전부 443 | 12 성공, 13번째 486 | 4/4 통과 |
| 변이: `::-::1` 복원, 로컬 4.6.1 | **403(전부 거부)** | 403 | 443 | 486 | TC-331 **실패**(결함 탐지됨) |

출력 인용(도커 4.9):
```
[coturn L2 docker mirror.gcr.io/coturn/coturn:4.9] 공인: 203.0.113.5=허용 8.8.8.8=허용
[coturn L2 docker ...] 사설 등: 10.1.2.3=403 172.16.5.5=403 192.168.1.1=403 127.0.0.1=403 169.254.169.254=403 100.64.0.1=403 198.18.0.1=403 224.0.0.1=403 0.0.0.1=403
[coturn L2 docker ...] IPv4-mapped: ::ffff:10.1.2.3=443 ::ffff:127.0.0.1=443 ::ffff:203.0.113.5=443 ::1=443
[coturn L2 docker ...] quota: 성공 12건, 마지막={"ok":false,"code":486}
```
변이 시험 시 L1도 `::1-::1` 부재와 `[ '::-::1' ]` 검출로 실패했다. 이후 `::1-::1`로 복원했고 `git diff`로 확인했다.

한계(미검증): IPv6 릴레이(L3)는 이 샌드박스에 IPv6가 없어 미검증이므로 `::ffff:0:0-::ffff:ffff:ffff` 줄의 자체 유효성은 증명되지 않았다(443은 주소 패밀리 불일치로 deny 목록 이전에 나는 응답, 03 6.3 해석과 일치). 공인 `relay-ip` 환경과 GitHub Actions 상의 `coturn` job 실행도 미검증이다.

## 게이트 1 — 정적 분석
- `npm run lint`: 통과(경고 0, 오류 0; 처음 있던 non-null 경고 4건은 수정).
- `npm run typecheck`: 통과(처음 있던 `Buffer` 타입 오류 1건 수정).
- `npm test`: server 6 files 통과 / 1 skipped(L2, `COTURN_LIVE` 미설정 사유 표시), 96 passed, 4 skipped; web 14 passed. 기본 실행 시간 증가는 L1 약 0.4초 미만.
- `npm run check:docs`: **실패 4건, 이 단위 외 요인 포함**. (a) `TC/IT ID 중복: TC-301`은 unit-0 쪽 테스트. (b) SEC-09 행의 TC 열 불일치: 새 TC-330~334가 코드에 있으나 문서 표에 없음 → 문서 갱신(`--gen`/test-cases.md)이 필요하다(docs/ 수정은 금지라 하지 않음). (c) SEC-06·SEC-10 불일치는 unit-0의 TC-301/302 때문. 내 TC-330 중복 실패는 b/c/d 접미사로 해소했다.

## 게이트 2 — 자체 리뷰
- [x] 설계서 명세와 일치(L1 항목 전부, L2 ①~④, CI는 REQUIRE 모드)
- [x] 에러 처리: 응답 시간 초과·기동 실패·조기 종료를 예외로 올림. 삼키는 코드는 기동 대기 루프의 재시도(의도, 기한 있음)뿐
- [x] 입력 검증: 해당 없음(시험 코드). 잘못된 IP는 예외
- [x] 하드코딩 시크릿 없음: 시험용 임의 공유 비밀(`live-test-secret...`)은 로컬 시험 인스턴스 전용이며 설정 파일에는 쓰지 않음(L1이 `static-auth-secret=`·`user=` 부재를 검사)
- [x] 새 의존성 없음(node 내장만)
- [x] 범위 외 변경 없음. 주의: 작업 트리의 다른 수정 파일은 unit-0/20 소속

## 6단계 인수 조건
1. `npm test`에서 TC-330~330d 통과, L2 4건은 skipped로 사유가 표시된다.
2. `COTURN_LIVE=1 REQUIRE_COTURN=1 npx vitest run --root apps/server test/coturn`(도커가 `--network host`로 coturn을 띄울 수 있는 환경): TC-331~334 통과. 도구가 하나도 없으면 실패해야 한다(조용한 skip 금지).
3. `COTURN_RUNNER=docker`와 `COTURN_RUNNER=local` 양쪽에서 위 표와 같은 결과(공인 허용, 사설 403, mapped 443, 13번째 486).
4. 변이 시험: `turnserver.conf`에 `denied-peer-ip=::-::1`을 다시 넣으면 TC-330c와 TC-331이 실패해야 한다.
5. compose 이미지 태그를 `latest` 또는 4.8로 바꾸면 TC-330d가 실패해야 한다.
6. 기존 IT-21/22(`e2e/turn.spec.ts`)는 수정하지 않았다.

## 수동 확인 필요
- GitHub Actions의 `coturn` job 실행(docker pull·`--network host` 동작).
- `max-bps` 의도(12Mbps 유지 vs 1.5Mbps) 사용자 확인.
- 공인 `relay-ip`와 IPv6 호스트에서의 L3.

## 공유 문서 갱신 요청
- `docs/05-qa/test-cases.md`: TC-330, TC-330b, TC-330c, TC-330d(L1), TC-331~334(L2), IT-34(CI coturn job) 추가. 매핑: SEC-12, SEC-09. 이후 `node scripts/check-docs.mjs --gen`으로 `docs/traceability.md` 갱신.
- `docs/harness/traceability.md`: SEC-12 / 작업 단위 = unit-18, 구현 상태 = 구현 완료(L2 로컬·도커 실측 통과, CI job 미검증). POL-18(coturn 로그 설정) = unit-18 일부(compose 로테이션 완료).
- `docs/harness/decisions.md`(오케스트레이터): D-1 해소 기록(`::1-::1` + L1/L2 가드로 회귀 방지), `max-bps` 값 유지 결정 및 사용자 확인 요청, D-2 `simple-log` 주석 정정 완료.
- 03 6.3 실측 표 갱신 필요 없음(이번 실측이 같은 값 재현).
