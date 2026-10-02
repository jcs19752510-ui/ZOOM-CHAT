> **이 문서의 용도** — 누가: 사용자(승인자), 아키텍트 / 언제: Phase 7에서 배포 대상을 고르고 비용·구성을 정할 때 / 무엇을: 배포 구성, 포트, 환경별 설정, 후보 비교를 결정한다. **최종 배포 대상은 사용자가 정한다(미결).**

# 인프라·배포 계획

| 항목 | 내용 |
|---|---|
| 버전 | 0.2 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (구현·검증 반영, DEC-004) |
| 주도 | ④ 아키텍트, ② 개발자 |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 |
| 0.2 | 2026-10-02 | 11단계 정정(10단계 C-08·C-09·DEF-10-04): 5349(TURNS)를 "현재 구성으로는 켤 수 없음"으로, `EXTERNAL_IP`를 "저장소에 설정 경로가 없음"으로 정정. 운영 필수 환경변수·보관 대상·프록시 요구 추가, 10단계 실측 사실 §6 추가 |


## 1. 구성
```
인터넷 ─ 443/TCP ─▶ 리버스 프록시(TLS 종단, WebSocket 허용) ─▶ MeetLite 서버(3001, API+소켓+웹)
인터넷 ─ 3478/UDP·TCP, 49160-49200/UDP ─▶ coturn (TURN/STUN)     ※ 5349/TCP(TURNS)는 현재 구성으로 켤 수 없다(아래 §2)
```
- 앱은 컨테이너 1개(`Dockerfile`)로 API, 소켓, 웹 정적 파일을 함께 제공한다(NFR-07). 상태는 메모리뿐이라 볼륨이 필요 없다.
- coturn은 같은 서버에서 따로 돌리거나 별도 호스트를 쓴다. 설정은 `infra/coturn/turnserver.conf`(사설·루프백 릴레이 차단, 할당량), 개발용 실행은 `infra/docker-compose.yml`. **저장소의 coturn 구성은 개발용이다**: 운영 TURN(인증서·외부 IP)은 아직 만들 수 없다(§2, `runbook.md` §13).
- 소켓은 WebSocket 전용(롱폴링 폴백 없음)이라 **프록시가 WebSocket 업그레이드를 허용해야 한다**. 앱 포트(3001)는 프록시에서만 접근 가능하게 두고(`TRUST_PROXY>0`이면 직접 노출 금지), 프록시에서 IP당 동시 연결을 제한한다(`runbook.md` §12).
- HTTPS 필수: 브라우저는 HTTPS(또는 localhost)에서만 카메라·마이크를 허용한다(A-01). 인증서는 배포 대상에 따라 자동 발급(예: Let's Encrypt)을 쓴다(**대상별 확인 필요**).

## 2. 포트·방화벽
| 포트 | 프로토콜 | 용도 | 비고 |
|---|---|---|---|
| 443 | TCP | HTTPS/WSS (앱) | 프록시 뒤 앱 포트는 3001, 외부 비공개 |
| 3478 | UDP·TCP | TURN/STUN | 필수 |
| 5349 | TCP | TURNS(TLS) | **현재 구성으로는 열리지 않는다.** `turnserver.conf`에 `tls-listening-port`는 있으나 인증서·키 설정과 compose 마운트가 없어 coturn이 `cannot find certificate file … cannot start TLS and DTLS listeners`를 내고 3478만 리슨한다(10단계 실측 C-08). 쓰려면 인증서 구성을 새로 만들어야 한다(DEF-10-04, 사용자 결정 U-4) |
| 49160–49200 | UDP | TURN 릴레이 범위 | 41포트뿐이라 `total-quota=300`보다 먼저 소진된다(동시 릴레이 상한 추정, 미실측 — DEF-10-13). 동시 릴레이 수에 맞춰 조정 |

**외부 IP**: compose 파일 주석은 "`EXTERNAL_IP`를 반드시 설정"이라 하지만 **저장소 어디에도 `EXTERNAL_IP`·`external-ip` 설정 경로가 없다**(grep 0건, 10단계 C-09). NAT 뒤(대부분의 클라우드 VM)에서는 릴레이 주소가 잘못 알려질 수 있다. 운영 구성 전에 `external-ip` 추가 여부를 정해야 한다(DEF-10-04, 인프라 파일이라 사용자 허락 후).

## 3. 환경별 설정 (`.env.example` 참고)
| 변수 | 개발 | 운영 |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3001` | 실제 `https://` 주소만 |
| `SESSION_SECRET` | 임의 긴 값(예시 값 사용 금지) | `openssl rand -base64 48` |
| `TURN_URLS`, `TURN_SECRET` | 비움(STUN만) 또는 로컬 coturn | coturn 주소, coturn과 **같은 비밀값** |
| `TRUST_PROXY` | 0 | 프록시 단계 수(보통 1) |
| `WEB_DIST` | 비움(Vite가 제공) | `apps/web/dist`(Dockerfile이 설정) |
| `MAX_PARTICIPANTS`, `MAX_ROOMS`, `RECONNECT_GRACE_SEC` | 기본 6, 100, 20 | 필요 시 조정 |
| `NODE_ENV` | `development` | **`production`**(이미지는 설정됨) |
| `OPERATOR_CONTACT`, `LEGAL_EFFECTIVE_DATE`, `PRIVACY_OFFICER` | 비움 | **공개 전 필수**(앞 둘, 코드상 선택·미설정 시 화면이 "미정"). `PRIVACY_OFFICER`는 법률 검토 후 |
| `ADMIN_PORT`, `ADMIN_TOKEN` | 비움 | 방 폐쇄를 쓸 때만 둘 다. 127.0.0.1 전용이라 **컨테이너 안에서 명령을 실행할 수 있어야** 쓸 수 있다 |
| `RATE_LIMIT_SCALE` | 비움 | **설정 금지**(시험용) |

환경변수 전체 표는 `docs/06-ops/admin-manual.md` §2, 보관 방법은 `docs/06-ops/runbook.md` §2·§4.

## 4. 배포 후보 비교 (비용은 **미확인**, 사용자 확인 U-02)
| 후보 | 장점 | 단점/주의 | 적합 |
|---|---|---|---|
| A. VPS 1대(앱+coturn, Docker) | 구성 단순, 비용 예측 쉬움, TURN 포트 자유 | 직접 운영(보안 패치·재시작) | 1인 운영, 이 프로젝트의 기본안 |
| B. PaaS(컨테이너 플랫폼) + 별도 TURN | 배포·TLS 간편 | **UDP 포트 범위 개방이 어려운 곳이 많아 TURN은 별도 필요**, WebSocket·유휴 연결 정책 확인 필요 | 앱만 먼저 띄울 때 |
| C. 관리형 TURN/SFU 서비스 | 운영 부담↓, 품질↑ | 사용량 과금, 외부 의존 | 6명 초과·품질 문제 시(SFU 전환과 함께) |

선택 시 확인할 것: UDP/TURN 포트 개방 가능 여부, WebSocket 지원, 월 비용 상한, 인증서 자동화, 재시작 시 방 소멸 허용 안내.

## 5. 비용 구조 가설 (수치 미확인)
- 앱 서버: 부하 시험상 600소켓·신호 3.9만 건에서 메모리 약 130MB(`performance-test.md`). 소형 VM으로 충분하다는 가설.
- **TURN 트래픽이 주 변수**: 직접 연결(P2P)이 되면 미디어는 서버를 지나지 않는다. 릴레이 비율은 운영 중 관측(KPI-05). 6명 방의 한 참가자가 릴레이를 쓰면 약 (인원−1)×비트레이트 ≈ 2Mbps(NFR-13 상한 기준)를 서버가 중계한다.

## 6. 10단계에서 확인한 사실 (배포 후보 비교용 — 후보를 고르지 않는다)
출처: `docs/harness/10-deploy-test.md` §4.8(로컬 컨테이너 리허설, 스테이징 없음). 비용·각 플랫폼의 제약은 **미확인**이다.
| 항목 | 사실 |
|---|---|
| 실행 단위 | 컨테이너 1개(API+소켓+웹), 포트 `PORT`, 이미지 271MB, 빌드 약 20초(캐시), 시작 1초 이내 `/healthz` 응답 |
| 상태·확장 | 방 상태는 메모리, **인스턴스 1개 고정**, 볼륨·DB 불필요, 재시작 = 회의 종료. 롤링·블루/그린 불가 |
| 종료 | SIGTERM·SIGINT 처리, 강제 종료 10초(고정). 응답 없는 클라이언트가 있으면 10초·종료 코드 1. 플랫폼의 stop 대기는 15초 이상 권장 |
| 헬스체크 | `GET /healthz`. 이미지 HEALTHCHECK는 30초 간격·`start-period` 없음(PaaS는 자체 경로 설정이 필요할 수 있음 — 플랫폼별 미확인) |
| 사용자 | `USER node`(이름). 숫자 UID를 요구하는 플랫폼은 설정 필요 |
| 프록시·TLS | 앱은 TLS를 하지 않는다. **WebSocket 업그레이드 필수**(폴링 폴백 없음, 코드 확인). 앱이 HSTS(`includeSubDomains`, 1년)를 직접 보낸다 |
| 관리 기능 | 방 폐쇄 admin은 컨테이너 안 `127.0.0.1`에만 열려 **셸 접근(`docker exec`/SSH)이 필요**. 셸이 없는 PaaS는 이 절차를 쓰기 어렵다 |
| 로그 | stdout JSON. 수집·보관은 플랫폼 의존. coturn 로그는 IP를 포함 |
| TURN | `network_mode: host`, UDP·TCP 3478 + UDP 49160–49200, TURNS·외부 IP 구성 불가(위 §2). UDP 범위 개방이 어려운 플랫폼은 TURN을 별도로 |
| 이미지 | 레지스트리 없음(로컬 `docker build`). 롤백 대상 보존은 운영자 책임. 베이스 `node:22-alpine`은 부동 태그 |
