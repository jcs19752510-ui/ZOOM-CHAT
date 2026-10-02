> **이 문서의 용도** — 누가: 기획자, 개발자, 보안 담당자 / 언제: 요구가 바뀔 때, 게이트·Phase를 승인할 때 / 무엇을: 모든 요구가 정책·화면·이벤트·테스트에 연결되어 있는지(미연결=결함)를 결정한다.

# 추적성 매트릭스

| 항목 | 내용 |
|---|---|
| 버전 | 0.1 |
| 작성일 | 2026-10-01 |
| 상태 | 승인 (전 열 자동 도출, 2026-10-01) |
| 주도 | ① 기획자(PM) |

## 변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| 0.1 | 2026-10-01 | 최초 작성 |
| 0.2 | 2026-10-01 | EVT는 api-spec §7, TC는 테스트 제목의 [요구 ID]에서 자동 도출 |

규칙: 모든 열을 문서와 테스트에서 **자동 도출**한다(손으로 고치지 않는다, `node scripts/check-docs.mjs --gen`). POL/SCR/FLOW는 정책서·화면 정의서·플로우의 "요구 참조", EVT는 `api-spec.md` §7, TC는 테스트 제목의 `[요구 ID]`, UAT/MC는 `uat.md`·`manual-checks.md`의 행에서 가져온다. "공통"은 모든 화면에 적용되는 규칙이다. 미연결은 결함으로 보고한다.

<!-- BEGIN GENERATED -->
| 요구 ID | 우선 | 요약 | POL | SCR | FLOW | EVT | TC | 비고 |
|---|---|---|---|---|---|---|---|---|
| FR-01 | M | 닉네임을 입력하고 방을 만든다(비밀번호 선택). 방 ID가 포함된 공… | POL-04, POL-15 | SCR-01 | FLOW-01 | EVT-02, EVT-03, EVT-10 | IT-01, IT-50, TC-101, TC-454, TC-454b, TC-467, TC-468, TC-468t, TC-469k, TC-469l, TC-469m, TC-469n, TC-469o, TC-469q, TC-476e, TC-500, TC-509, TC-511 |  |
| FR-02 | M | 링크 복사 버튼으로 공유 링크를 클립보드에 복사한다. 복사 결과를 알… | - | SCR-02, SCR-03, SCR-12 | FLOW-01 | 클라이언트 전용 | IT-23, IT-59b, TC-453x, TC-466k, TC-469s, TC-469t, TC-469u, TC-514c |  |
| FR-03 | M | 링크로 접속해 닉네임을 입력해 입장한다. 같은 방에 같은 닉네임이 있… | POL-04 | SCR-01, SCR-02 | FLOW-02 | EVT-10, EVT-18, EVT-19, EVT-20, EVT-24, EVT-25, EVT-29 | IT-01, IT-19, IT-50, IT-59, TC-08, TC-30, TC-37, TC-204, TC-205, TC-230, TC-231, TC-233, TC-240, TC-440b, TC-441, TC-446, TC-453m, TC-454, TC-467d, TC-468, TC-468b, TC-468n, TC-469p, TC-500, TC-508, TC-508b, TC-508c, TC-509b, TC-509e, TC-512, TC-514d, TC-516, UAT-01 |  |
| FR-04 | M | 대기실에서 카메라·마이크 미리보기, 장치 선택, 권한 거부 안내를 보… | - | SCR-02, SCR-06, SCR-14 | FLOW-02, FLOW-06 | 클라이언트 전용 | IT-01, IT-13, IT-17, IT-52, IT-59, TC-453l, TC-453p, TC-453q, TC-453r, TC-453s, TC-453t, TC-453u, TC-453v, TC-453w, TC-453y, TC-468b, TC-477, TC-477g, TC-478, TC-478b, TC-478g, TC-478h, TC-478i, TC-478k, TC-478m, TC-503, TC-507, TC-507b, UAT-01, UAT-03 |  |
| FR-05 | S | 비밀번호가 설정된 방은 입장 시 비밀번호를 입력해야 한다. 시도 횟수… | POL-11 | SCR-02 | FLOW-02 | EVT-02, EVT-03, EVT-10 | IT-07, IT-59, TC-06, TC-90, TC-91, TC-92, TC-438c, TC-453n, TC-453o, TC-469l, TC-469r, TC-476f |  |
| FR-06 | M | 입장할 수 없을 때(방 가득 참, 방 잠김, 방 없음/만료, 강퇴됨,… | POL-01 | SCR-01, SCR-15, SCR-16, SCR-18, SCR-19, SCR-20 | FLOW-02 | EVT-10, EVT-18, EVT-19, EVT-20, EVT-24, EVT-25, EVT-29 | IT-16, IT-18, IT-51, IT-56, TC-05, TC-102, TC-434, TC-467b, TC-467c, TC-468c, TC-509b, TC-509c, TC-511b, TC-514, TC-514b, TC-514c, TC-514e, TC-516b, TC-516c, TC-517c, TC-524 |  |
| FR-07 | M | 방 안 참가자(최대 6명, 설정값)끼리 영상과 음성으로 통화한다. | POL-01 | SCR-03 | - | EVT-13, EVT-15, EVT-16, EVT-17, EVT-23, EVT-26 | IT-01, IT-16, IT-20, IT-21, IT-51, TC-01, TC-33, TC-41, TC-124, TC-434b, TC-460c, TC-468e, TC-479, TC-479e, TC-479f, TC-479k, TC-479m, TC-479o, TC-479p, TC-504, UAT-02, UAT-06 |  |
| FR-08 | M | 마이크와 카메라를 켜고 끌 수 있고, 상태가 다른 참가자에게 보인다. | - | SCR-03 | - | EVT-13, EVT-15, EVT-16, EVT-17, EVT-23, EVT-26 | IT-02, TC-73, TC-439, TC-453s, TC-455b, TC-455d, TC-456, TC-463, TC-463b, TC-463c, TC-463d, TC-464d, TC-468g, TC-468y, TC-478c, TC-478d, TC-478j, TC-478n, TC-478p, TC-479d |  |
| FR-09 | S | 통화 중 카메라·마이크(·스피커 지원 시) 장치를 바꾼다. | - | SCR-06 | - | EVT-13, EVT-15, EVT-16, EVT-17, EVT-23, EVT-26 | IT-13, TC-469w, TC-469x, TC-477c, TC-478e, TC-478f, TC-478l, TC-479l |  |
| FR-10 | S | 말하는 참가자의 타일을 강조한다. | - | SCR-03 | - | 클라이언트 전용 | IT-14, TC-463, TC-463b, TC-463d, TC-466b, TC-466c, TC-476, TC-476b, TC-476c, TC-476d, TC-476h, TC-476i, TC-476j, TC-476k, TC-476l, TC-476m, TC-476n, TC-476o, TC-476p, TC-476q |  |
| FR-11 | S | 방 안 실시간 텍스트 채팅. 서버에 저장하지 않으며 입장 이전 대화는… | POL-07 | SCR-04 | - | EVT-14, EVT-27 | IT-04, IT-57, IT-57b, IT-57c, TC-70, TC-71, TC-200, TC-234, TC-235, TC-236, TC-237, TC-450, TC-450b, TC-450c, TC-450d, TC-450e, TC-450f, TC-450g, TC-450h, TC-450i, TC-450k, TC-450l, TC-450m, TC-450q, TC-450r, TC-450s, TC-450t, TC-450v, TC-451, TC-452, TC-453, TC-459, TC-459b, TC-466m, TC-466r, TC-468h, TC-468p, TC-522 |  |
| FR-12 | S | 데스크톱 브라우저에서 화면공유를 시작/중지한다. 모바일 브라우저에는 … | POL-12 | SCR-03 | FLOW-08 | EVT-13, EVT-15, EVT-16, EVT-17, EVT-23, EVT-26 | IT-08, TC-23, TC-24, TC-72, TC-456b, TC-458, TC-458b, TC-462, TC-462b, TC-462c, TC-466q, TC-468q, TC-468x, TC-477d, TC-477e, TC-477f, TC-479d, TC-479k, TC-479l, TC-520, TC-521 |  |
| FR-13 | M | 참가자 목록에서 이름, 호스트 표시, 마이크/카메라/화면공유 상태를 … | - | SCR-05 | - | EVT-21, EVT-22, EVT-23 | IT-02, IT-28, IT-59b, TC-466, TC-468f, TC-470f, TC-470g, TC-470h, TC-470i, TC-473, TC-474 |  |
| FR-14 | M | 호스트가 방을 잠그거나 해제한다. 잠기면 신규 입장이 거부된다. | POL-03, POL-05 | SCR-05, SCR-16 | FLOW-07 | EVT-10, EVT-18, EVT-19, EVT-20, EVT-24, EVT-25, EVT-29 | IT-05, IT-53, TC-18, TC-19, TC-60, TC-61, TC-438, TC-466h, TC-466l, TC-468g, TC-468o, TC-470, TC-470b, TC-470d, TC-470e, TC-470k, TC-472 |  |
| FR-15 | M | 호스트가 참가자를 강제 퇴장시킨다. 강퇴된 사람은 재입장이 차단된다. | POL-05, POL-06 | SCR-05, SCR-07, SCR-18 | FLOW-05 | EVT-10, EVT-18, EVT-19, EVT-20, EVT-24, EVT-25, EVT-29 | IT-05, IT-53, TC-20, TC-21, TC-60, TC-62, TC-63, TC-437, TC-437b, TC-466h, TC-466p, TC-468i, TC-468o, TC-470, TC-470c, TC-470d |  |
| FR-16 | S | 호스트가 전체 음소거를 한다(끄기만 가능, 각자 다시 켤 수 있음). | POL-05 | SCR-05, SCR-07 | - | EVT-10, EVT-18, EVT-19, EVT-20, EVT-24, EVT-25, EVT-29 | IT-05, IT-53, TC-22, TC-60, TC-64, TC-439b, TC-466p, TC-468j, TC-468o, TC-470, TC-470b, TC-470d, TC-471, TC-516b, TC-517 |  |
| FR-17 | M | 호스트가 나가면 가장 먼저 입장한 참가자가 호스트를 승계한다. | POL-05 | SCR-05 | FLOW-04 | EVT-10, EVT-18, EVT-19, EVT-20, EVT-24, EVT-25, EVT-29 | IT-09, TC-09, TC-10, TC-11, TC-12, TC-13, TC-65, TC-435, TC-435b, TC-466s, TC-468g, TC-470g, TC-473 |  |
| FR-18 | M | 마지막 참가자가 나가면 방을 즉시 삭제한다. 생성 후 10분간 아무도… | POL-02 | SCR-19 | FLOW-04, FLOW-07 | EVT-11, EVT-12, EVT-22, EVT-23 | TC-14, TC-15, TC-16, TC-17, TC-440 |  |
| FR-19 | M | 연결 상태(연결됨/재연결 중/불안정)를 표시하고, 네트워크 불량 시 … | POL-08 | SCR-03, SCR-17 | FLOW-03 | EVT-11, EVT-12, EVT-22, EVT-23 | IT-03, TC-463d, TC-464, TC-465, TC-465b, TC-465c, TC-465d, TC-466j, TC-466w, TC-468k, TC-468w, TC-479q, TC-479r, TC-479s, TC-479t, TC-479u, TC-504c, UAT-05 |  |
| FR-20 | M | 네트워크가 끊기면 자동 재연결해 같은 자리(참가자 정체성)로 복구한다… | POL-08 | SCR-17 | FLOW-03 | EVT-11, EVT-12, EVT-22, EVT-23 | IT-03, TC-02, TC-52, TC-53, TC-435b, TC-436, TC-436b, TC-444, TC-468k, TC-468l, TC-468m, TC-468s, TC-468t, TC-468u, TC-479g, TC-479n, TC-502b, TC-505, TC-518, TC-518b, TC-519, UAT-05 |  |
| FR-21 | S | 서버 재시작 등으로 방이 사라졌을 때 이유와 다시 시작하는 방법을 안… | POL-02, POL-08 | SCR-19 | FLOW-03 | EVT-11, EVT-12, EVT-22, EVT-23 | IT-15, TC-468l, TC-517, TC-518 |  |
| FR-22 | M | 나가기 버튼으로 확인 후 방을 떠난다. 나간 뒤 다시 입장할 수 있는… | - | SCR-03, SCR-07, SCR-21 | - | EVT-11, EVT-12, EVT-22, EVT-23 | IT-19, TC-455b, TC-466h, TC-466o, TC-466s, TC-468n, TC-468v, TC-479j, TC-505b, TC-506, TC-517, TC-517b, TC-517d, TC-521 |  |
| FR-23 | S | 방 생성자(호스트)가 입장하기 전에 도착한 참가자는 대기 화면을 보고… | POL-13 | SCR-22 | FLOW-02, FLOW-07 | EVT-02, EVT-03, EVT-10 | IT-06, IT-56, TC-03, TC-04, TC-34, TC-102, TC-438b, TC-514b, TC-515, TC-515b, TC-524b |  |
| NFR-01 | M | 링크 클릭 후 **조작 3회 이내** 입장(닉네임 입력, 권한 허용,… | - | SCR-02 | FLOW-02 | - | IT-01, IT-50, TC-453y, TC-469q, TC-476e, TC-510, UAT-01 |  |
| NFR-02 | M | 입장 후 첫 원격 영상 표시: 중앙값 5초 이내, p95 10초 이내… | - | SCR-11 | - | - | IT-24, IT-30, TC-514e, TC-517b |  |
| NFR-03 | M | 재접속 유예 시간 20초(설정값, 제안), 그 안에 복구되면 자리 유… | POL-08 | - | FLOW-03 | - | IT-03, IT-29, TC-468s, TC-479h, TC-479v, TC-479w, TC-506, TC-513, UAT-05 |  |
| NFR-04 | M | 방당 최대 6명(설정값), 동시 방 30개 목표, 서버 전체 방 상한… | POL-01, POL-02, POL-15 | - | - | - | IT-20, IT-29, MC-04, TC-124, TC-424, TC-434, UAT-06 |  |
| NFR-05 | M | Chrome/Edge/Firefox/Safari 최신 2개 버전, i… | POL-14 | SCR-20 | - | - | IT-18, TC-476h, TC-476i, TC-477b, TC-477d, TC-477f, TC-477h, UAT-02, UAT-04 |  |
| NFR-06 | S | 서버 재시작 시 방 소멸을 허용한다. 배포·재시작 중 신규 방 생성 … | POL-08 | - | - | - | IT-15 |  |
| NFR-07 | M | 비용 최소: 서버 1대(앱+coturn) 구성이 기본. 월 상한은 미… | - | - | - | - | MC-03, MC-04, TC-111, TC-429, TC-429b, TC-492, TC-493 | 정책·화면 대신 EVT/TC로 추적 |
| NFR-08 | M | 운영성: `/healthz`, graceful shutdown, 구조… | - | - | - | - | MC-01, MC-03, TC-100, TC-111, TC-120, TC-424, TC-424b, TC-427, TC-427b, TC-491, TC-492, TC-495, TC-496 | 정책·화면 대신 EVT/TC로 추적 |
| NFR-09 | M | 접근성 WCAG 2.2 AA(키보드, 스크린리더 안내, 색 대비). | - | 공통 | - | - | IT-11, IT-12, IT-54, IT-54b, IT-55, TC-214, TC-215, TC-216, TC-216b, TC-216c, TC-216d, TC-217, TC-217b, TC-217c, TC-466e, TC-466g, TC-469y, TC-469z, TC-484d, UAT-07 |  |
| NFR-10 | M | 360px부터 반응형, 터치 타깃 44px 이상, 모바일 가로 모드 … | - | 공통 | - | - | IT-10, IT-31, IT-32, IT-37, IT-38, IT-57, IT-58, IT-58b, TC-457, TC-459c, TC-459d, TC-460b, TC-466x, TC-469o, TC-469v, TC-476g, TC-480b, TC-484b, TC-485, TC-485b, TC-485c, TC-485d, TC-485e, TC-485f, TC-486b, UAT-02 |  |
| NFR-11 | M | 유지보수성: TypeScript strict, 계층 분리(room/s… | - | - | - | - | MC-01, TC-490, TC-494, TC-495, TC-496, TC-497, TC-498 | 정책·화면 대신 EVT/TC로 추적 |
| NFR-12 | M | 모든 시그널링 메시지에 `version` 필드. | - | - | - | - | TC-241, TC-420, TC-420b, TC-421c | 정책·화면 대신 EVT/TC로 추적 |
| NFR-13 | M | 품질 적응: 인원 수에 따라 해상도·비트레이트 상한을 낮춘다(수치는 … | - | SCR-03 | - | - | IT-20, IT-29, IT-30, TC-210, TC-211, TC-479c, TC-479x, TC-479y, UAT-06 |  |
| SEC-01 | - | 방 ID는 crypto 기반 128비트 이상 난수(URL-safe). | POL-02 | - | - | EVT-30, EVT-31, EVT-32 | TC-101, TC-137, TC-245, TC-432b |  |
| SEC-02 | - | 방 비밀번호는 해시로만 보관, 입장 시도를 IP+방 기준 제한. | POL-11 | - | - | EVT-30, EVT-31, EVT-32 | IT-07, TC-06, TC-90, TC-91, TC-107, TC-133, TC-134, TC-136, TC-343b, TC-348b, TC-349d, TC-349e, TC-431c, TC-432, TC-438c, TC-447, TC-467, TC-469m, TC-511 |  |
| SEC-03 | - | 입장 시 서명된 단기 세션 토큰 발급, 이후 모든 소켓 이벤트·재접속… | POL-08 | - | - | EVT-30, EVT-31, EVT-32 | TC-30, TC-32, TC-50, TC-51, TC-52, TC-54, TC-130, TC-405, TC-412, TC-426, TC-430, TC-430b, TC-430c, TC-430d, TC-441, TC-442, TC-444, TC-444b, TC-446c, TC-468, TC-468d, TC-468u, TC-469, TC-501, TC-516 |  |
| SEC-04 | - | 발신자 ID는 서버 부여값만 신뢰(사칭 방지), 같은 방 참가자에게만… | POL-07 | - | - | EVT-30, EVT-31, EVT-32 | TC-40, TC-41, TC-42, TC-44, TC-138, TC-242, TC-243, TC-387, TC-420b, TC-432b, TC-432c, TC-440c, TC-446b, TC-448 |  |
| SEC-05 | - | 호스트 여부·모든 권한은 서버 상태로만 판단, 강퇴 세션 재입장 차단… | POL-03, POL-05, POL-06, POL-13 | - | FLOW-05 | EVT-30, EVT-31, EVT-32 | IT-05, IT-53, TC-04, TC-18, TC-20, TC-35, TC-36, TC-60, TC-62, TC-426, TC-437, TC-437b, TC-438b, TC-448, TC-466p, TC-468i, TC-468o, TC-470, TC-470c, TC-470d |  |
| SEC-06 | - | 모든 소켓 이벤트에 zod 검증·크기 제한·이벤트별 rate limi… | POL-04, POL-07, POL-10, POL-15 | - | - | EVT-30, EVT-31, EVT-32 | IT-37b, TC-07, TC-31, TC-43, TC-80, TC-81, TC-96, TC-105, TC-106, TC-108, TC-135, TC-230, TC-231, TC-232, TC-236, TC-240, TC-241, TC-242, TC-243, TC-244, TC-245, TC-302, TC-304, TC-346e, TC-348g, TC-348h, TC-403, TC-404, TC-406, TC-410, TC-411, TC-413, TC-414, TC-420, TC-420b, TC-421, TC-421c, TC-422, TC-422b, TC-425, TC-428b, TC-431, TC-431b, TC-443, TC-443b, TC-444c, TC-445b, TC-447b, TC-448b, TC-483, TC-501, TC-504, TC-504b |  |
| SEC-07 | - | 채팅 길이 제한, 텍스트로만 렌더링, 링크 `rel="noopener… | POL-07 | - | - | - | IT-04, IT-33, IT-33b, IT-37, IT-57, TC-70, TC-71, TC-200, TC-201, TC-202, TC-203, TC-234, TC-235, TC-344, TC-345, TC-345b, TC-345c, TC-345d, TC-347, TC-347b, TC-347c, TC-347d, TC-347e, TC-421b, TC-450, TC-450d, TC-450e, TC-450j, TC-450n, TC-450o, TC-450p, TC-450u, TC-450w, TC-451, TC-467c, TC-469p, TC-470i, TC-474, TC-479g, TC-480e, TC-486c, TC-486f, TC-487, TC-488, TC-494, TC-508c |  |
| SEC-08 | - | Origin 허용 목록(CORS+Socket.IO), CSP, Per… | - | SCR-13 | - | - | TC-95, TC-103, TC-104, TC-105, TC-109, TC-122, TC-340c, TC-348f, TC-422, TC-423, TC-428, TC-428b, TC-429, TC-445, TC-446d, TC-448b |  |
| SEC-09 | - | TURN 단기 HMAC 임시 자격증명, 고정 비밀번호 금지, 사설/루… | - | - | - | EVT-30, EVT-31, EVT-32 | IT-21, IT-22, IT-46, TC-123, TC-131, TC-132, TC-132b, TC-330, TC-330b, TC-331, TC-332, TC-333, TC-334, TC-433, TC-446c, TC-479b, TC-479z, TC-493 | 정책·화면 대신 EVT/TC로 추적 |
| SEC-10 | - | 비밀값은 `.env`만, 로그에 개인정보·SDP·토큰 미기록. | POL-09, POL-16 | - | - | - | MC-05, TC-121, TC-125, TC-301e, TC-301f, TC-303d, TC-340c, TC-342, TC-342b, TC-348, TC-349c, TC-375, TC-388, TC-415, TC-424, TC-424b, TC-445, TC-446c, TC-492, TC-493 |  |
| SEC-11 | - | 공급망: `npm ci` + lockfile, 새 의존성은 사전 보고… | - | - | - | - | MC-02, TC-490, TC-491, TC-497 | 정책·화면 대신 EVT/TC로 추적 |
| UX-01 | M | UI는 한국어. 모든 문구는 strings 파일 한 곳에서 관리한다. | - | SCR-01, 공통 | - | - | TC-213, TC-305, TC-305b, TC-305c, TC-305d, TC-305e, TC-305f, TC-305g, TC-305h, TC-306, TC-341d, TC-486d, TC-489b |  |
| UX-02 | M | 상태 화면을 모두 설계한다: 로딩, 빈 상태, 오류, 권한 거부, 방… | - | SCR-11, SCR-12, SCR-13, SCR-14 | - | - | IT-10, IT-17, IT-42, IT-43, IT-51, IT-52, IT-56, IT-58, IT-59b, TC-466k, TC-480, TC-480b, TC-480e, TC-481, TC-481b, TC-481c, TC-481e, TC-509c, TC-514, TC-514b, TC-524 |  |
| UX-03 | M | 오류 문구는 **원인 + 해결 방법**을 함께 안내한다. | POL-08 | SCR-01, SCR-02, SCR-13, SCR-14, 공통 | FLOW-06 | - | IT-17, IT-33c, IT-37b, IT-50, IT-52, IT-56, IT-57b, IT-57c, IT-59, TC-305d, TC-453m, TC-453n, TC-453p, TC-453q, TC-467b, TC-468y, TC-469k, TC-469n, TC-469t, TC-469u, TC-477, TC-477g, TC-478d, TC-478k, TC-480, TC-480c, TC-481d, TC-481f, TC-482, TC-482b, TC-483, TC-483b, TC-507b, TC-516b, UAT-03 |  |
| UX-04 | M | 컨트롤바 순서: 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기.… | - | SCR-03 | - | - | IT-25, TC-455, TC-455b, TC-455d, TC-466m, TC-466x |  |
| UX-05 | M | 비디오 그리드는 1~6명에 맞게 자동 배치한다. | - | SCR-03 | - | - | IT-02, IT-10, IT-20, TC-459e, TC-460, TC-460b, TC-460c, TC-461, TC-461b, TC-461c, TC-463c, TC-463d |  |
| UX-06 | S | 화면공유 시 공유 화면을 크게, 참가자는 썸네일로 배치한다. | POL-12 | SCR-03 | FLOW-08 | - | IT-08, TC-462, TC-462b, TC-462c, TC-462d |  |
| UX-07 | S | 발언자 강조는 오디오 레벨 임계값 + 디바운스로 깜빡임을 방지한다. | - | SCR-03 | - | - | IT-14, TC-466b, TC-476, TC-476b, TC-476l, TC-476m, TC-476o, TC-476p, TC-476q |  |
| UX-08 | M | 다크 테마 기본. 색·간격·폰트는 디자인 토큰 한 곳에서 정의한다. | - | 공통 | - | - | TC-212, TC-212b, TC-212c, TC-214, TC-215, TC-216, TC-484c, TC-484f, TC-484g, TC-486, TC-486e |  |
| UX-09 | M | 대기실에서 WebRTC 특성상 네트워크 정보(IP)가 다른 참가자에게… | POL-16 | SCR-02 | - | - | IT-26 |  |
| UX-10 | M | 키보드로 입장부터 퇴장까지 가능, 아이콘 버튼 aria-label, … | - | SCR-07, 공통 | - | - | IT-11, IT-12, IT-31, IT-53, IT-54, IT-54b, IT-55, IT-58, IT-58b, TC-452, TC-453k, TC-453r, TC-453s, TC-453u, TC-455c, TC-456, TC-456b, TC-457, TC-463, TC-466d, TC-466e, TC-466f, TC-466g, TC-466n, TC-469r, TC-469v, TC-469y, TC-469z, TC-470j, TC-470k, TC-475, TC-476f, TC-476g, TC-480, TC-480d, TC-481c, TC-484d, TC-484h, TC-485, TC-486b, TC-489, TC-489b, TC-489c, TC-489d, UAT-07 |  |
| UX-11 | M | prefers-reduced-motion을 존중한다. | - | 공통 | - | - | IT-27, IT-55, TC-484, TC-484e |  |
| UX-12 | S | 참가자 입퇴장, 호스트 변경, 전체 음소거, 복사 결과는 토스트로 알… | - | SCR-03, SCR-04, SCR-17, 공통 | - | - | IT-23, IT-28, TC-450w, TC-452, TC-459, TC-459b, TC-466, TC-466i, TC-466r, TC-466w, TC-468r |  |
<!-- END GENERATED -->
