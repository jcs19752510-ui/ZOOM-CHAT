# 01 조각: 기술 이슈·도메인 운영 규칙 (WebRTC·브라우저 제약)

용도: 1단계 취합 시 출력 계약 6번(도메인 운영 규칙)·7번(리스크)의 입력으로 쓰이는 중간 산출물. 기획 담당(PM)이 2단계 요구 등록 전 읽는다.
조사 시점: 2026-10-01 (WebSearch 요약 기반. 원문 직접 열람은 일부만 성공: 아래 각 항목에 "원문 확인 여부" 표기). 조사 축: 기술 이슈·도메인 운영 규칙. 규제 민감 도메인 아님(화상회의), LLM 내장 기능 없음(프로젝트 문서상 비목표에 AI 기능 없음, 확인 필요 시 취합 단계에서 점검).

## 1. 모바일 브라우저 WebRTC 제약

| 항목 | 내용 | 근거(출처, 확인 수준) |
|---|---|---|
| iOS Safari 백그라운드/화면 잠금 | 화면 잠금·Safari가 백그라운드로 가면 WebRTC/WebAudio가 중단됨. 웹 허용 옵션은 아직 없음(개발자 요청 스레드 존재) | [Apple Developer Forums 774239](https://developer.apple.com/forums/thread/774239), [WebKit bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448). 검색 요약만 확인, 2026-10 기준 iOS 27에서의 변화는 **확인 필요** |
| 자동재생 | 원격 스트림 `<video>`에 `playsinline`(+ 필요 시 `muted`) 필요. `play()`가 `NotAllowedError`로 거부될 수 있으므로 거부 시 "탭하여 재생" 대체 UI 필요. 소리 포함 재생은 사용자 제스처 후 시작 권장 | [webrtcHacks: Autoplay restrictions](https://webrtchacks.com/autoplay-restrictions-and-webrtc/), [Apple Forums 133254](https://developer.apple.com/forums/thread/133254). 검색 요약 확인 |
| 인앱 브라우저(WKWebView) | iOS의 서드파티 앱 WebView는 getUserMedia 제한 이력(iOS 14.3부터 Safari 본체만 지원, 인앱에서는 오디오 요청 시 NotAllowedError 보고 사례). 최신 iOS의 인앱 동작은 **확인 필요** | [Apple Forums 699479](https://developer.apple.com/forums/thread/699479), [670322](https://developer.apple.com/forums/thread/670322). 카카오톡·인스타그램 개별 동작을 다룬 공개 자료는 **찾지 못함 = 확인 필요**(실기기 테스트 필요) |
| 화면공유(모바일) | 모바일 브라우저는 historically `getDisplayMedia` 미지원. 단, 2026-09-24 MDN 호환성 이슈에서 "iOS 27.0 Safari에서 getDisplayMedia가 피커를 열고 MediaStream 반환"이라는 **단일 사용자 보고**가 있음(미해결, MDN 미반영) | [mdn/browser-compat-data #30654](https://github.com/mdn/browser-compat-data/issues/30654)(원문 확인함). 단일 보고라 신뢰도 낮음. Android Chrome은 미지원으로 알려졌으나(2차 자료) 최신 상태 **확인 필요** |
| 카메라 권한 | iOS Safari는 사이트별 권한 재질문 정책이 있으며 SPA 경로 변경 시 카메라가 끊긴 사례 보고 | [Apple Forums 750254](https://developer.apple.com/forums/thread/750254). 검색 요약 수준 |

운영 규칙 시사: 모바일 화면공유는 기능 탐지(`navigator.mediaDevices?.getDisplayMedia`)로만 버튼 노출 판단하고 UA 스니핑 금지. 프로젝트 문서의 "화면공유는 데스크톱만"은 유지하되, iOS 27 변화는 후속 검증 대상(비목표 변경 아님).

## 2. Mesh 실무 한계

- 통설: 풀 메시는 4~6명이 한계. 참가자당 업링크 = (N-1) x 비트레이트, 다운링크도 동일. 예: 1 Mbps 4명이면 각자 3 Mbps 상하향. 6명이면 5개 업스트림 인코딩(CPU 부담). 출처: [Ant Media 가이드](https://antmedia.io/webrtc-network-topology/), [Trembit](https://trembit.com/blog/how-many-participants-can-we-place-in-one-webrtc-peer-2-peer-room/), [nat.io](https://nat.io/blog/scaling-webrtc-applications). 벤더 블로그(이해관계 있음, SFU 판매), 검색 요약 확인.
- 권장 수치 자체는 출처마다 상이하며 본 조사에서 공신력 있는 1차 측정치는 확보 못함. **6명 mesh의 실제 한계는 자체 측정 필요**(예: 6명 시 해상도를 360p/수백 kbps로 제한, 화면공유 시 썸네일 해상도 하향 등은 설계값 제안이지 조사 사실이 아님).
- 모바일 단말(특히 iOS)에서 5개 동시 인코딩은 발열·배터리 위험. 근거 자료 **확인 필요**(추정).

## 3. TURN 운영 현실

- 필요 비율: 공개 수치가 20% 안팎(15~20% 소비자, 20~30% 일반, 기업망 40~60%)으로 출처마다 다름. 출처: [NoJitter](https://www.nojitter.com/know-where-turn-when-deploying-webrtc), [100ms](https://www.100ms.live/blog/webrtc-turn-server), [Celloip 2026 가이드](https://celloip.com/blog/webrtc-turn-server-production-guide/), [webrtcHacks 사용 통계](https://webrtchacks.com/usage-stats/). 대부분 벤더 블로그로 측정 방법 불명. 한국 한정 수치는 **찾지 못함**.
- 대역폭: 릴레이 시 서버가 상·하향 양쪽 소화. 6명 mesh에서 릴레이 비율이 높은 사용자가 많으면 서버 1대 대역폭이 병목. 구체 비용은 호스팅 요금에 의존하므로 **확인 필요**(견적 필요).
- coturn 보안 필수 설정(출처: [EnableSecurity 가이드](https://www.enablesecurity.com/blog/coturn-security-configuration-guide/), 검색 요약만 확인, 원문 접근 차단): `use-auth-secret`+`static-auth-secret`(HMAC 임시 자격증명), `denied-peer-ip` 로 사설·루프백·링크로컬 범위 차단, `no-multicast-peers`, 불필요 CLI/관리 기능 비활성, TLS 설정, 할당량(`user-quota`, `total-quota`, `max-bps`) 설정. 옵션명 정확성은 coturn 공식 문서로 재확인 필요.
- 최근 취약점: CVE-2026-27624 — IPv4-mapped IPv6(`::ffff:127.0.0.1`)로 `denied-peer-ip` 우회, coturn 4.9.0에서 수정([SentinelOne DB](https://www.sentinelone.com/vulnerability-database/cve-2026-27624/), 검색 요약만, 원문 접근 차단). 또한 과거 CVE-2020-26262(기본 접근제어 우회). 따라서 coturn 버전을 4.9.0 이상으로 고정하고 IPv6 사설 범위도 차단해야 함(공식 릴리스 노트 **확인 필요**).
- TURN over TCP/TLS 443 폴백(UDP 차단망 대비) 필요성: UDP 차단 시 STUN/TURN UDP 불통([WebRTC 그룹 토론](https://groups.google.com/g/discuss-webrtc/c/bq2tUi_guE4)). 서버 1대에서 443을 웹과 공유할지는 설계 결정(확인 필요).

## 4. 브라우저 변경·폐기 예정

- 로컬 IP mDNS 난독화: Chrome 76부터 호스트 후보를 mDNS 호스트명으로 마스킹. 단 **getUserMedia 권한이 있는 사이트는 제외(실제 IP 노출)**. 출처: [discuss-webrtc PSA](https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU). 화상회의는 카메라 권한이 있으므로 같은 방 참가자에게 사설 IP가 노출될 수 있음 -> 대기실/참가 고지 문구 근거(프로젝트 보안 규칙의 "IP 노출 고지"와 일치). 최신 버전 유지 여부 **확인 필요**.
- getUserMedia: Chrome 151에서 선언형 `<usermedia>` 요소 도입 보도(2026-06-29 게시 기사). 표준 미확정, 타 브라우저 합의 없음. 기존 `getUserMedia`가 폐기된다는 근거는 **찾지 못함**. 출처: [Invide Labs](https://blog.invidelabs.com/chrome-usermedia-html-element/)(2차 자료). 영향은 없다고 보나 `getUserMedia` 계속 사용 전제.
- 보안 컨텍스트: getUserMedia/enumerateDevices는 보안 출처(HTTPS)에서만 동작(Chrome M74~)([PSA](https://groups.google.com/g/discuss-webrtc/c/QUdwwa-83K8)). 로컬 개발 외 HTTPS 필수.
- 최신 2개 버전 범위의 Firefox/Safari별 폐기 예정 WebRTC API: 본 조사에서 근거 **못 찾음 = 확인 필요**(Chrome Platform Status/WebKit release notes 직접 확인 필요).

## 5. 한국 환경 특이점

- 한국 모바일 망의 CGNAT·사내망 UDP 차단 비율을 다룬 한국 대상 공개 통계는 **찾지 못함**. 일반론(모바일 통신사의 제한적 NAT/CGNAT, 기업 방화벽 UDP 차단 시 TURN 필요)만 확인([Wikipedia CGNAT](https://en.wikipedia.org/wiki/Carrier-grade_NAT), 한국어 개발 블로그들). 한국 특화 수치는 추정조차 하지 않음.
- 카카오톡 링크 공유가 주요 유입 경로일 가능성이 높으나(추정, 근거 없음) 카카오톡 인앱 브라우저의 카메라/마이크 동작 공개 자료 **미확인** -> 실기기 검증 및 "외부 브라우저로 열기" 안내 화면 필요 여부를 2단계에서 결정해야 함.

## 6. 리스크·불확실성 (7번 입력)

1. iOS 백그라운드 중단은 우회 불가한 플랫폼 제약. 재연결(ICE restart·재입장) UX로 대응해야 함. 영향 큼/확실.
2. 인앱 브라우저 미디어 불가 가능성(특히 iOS) — 링크 클릭 후 3조작 입장 성공 기준에 직접 충돌. 확인 못함.
3. TURN 비율을 한국 기준으로 모름 -> 서버 1대 대역폭 산정 불가. 사전 측정/계측(릴레이 비율 로깅, 개인정보 제외) 필요.
4. coturn 설정 오류는 SSRF 유사 내부망 접근으로 이어질 수 있음(CVE 사례). 버전·IPv6 차단 검증 TC 필요.
5. 본 조각 근거 다수가 검색 요약 및 벤더 블로그. 원문을 열람한 것은 MDN 이슈 #30654뿐(CVE·coturn 가이드는 egress 차단으로 미열람). 취합 시 신뢰도 낮음으로 취급.
6. 법률 판단 없음: 해당 축 아님.

## 타 축 참고
- 경쟁/시장 축: 인앱 브라우저 제약은 "설치 없이 링크 입장" 가치 제안의 한계로 경쟁 비교에 반영 가능.
- 규제 축: 대기실·참가자 간 IP 노출(mDNS 예외)은 개인정보 고지 근거. TURN 로그 보관(IP)도 개인정보 이슈 후보 — 법적 판단은 확인 필요.
- LLM 축: 해당 없음.

## 2단계 시사점 (3개)
1. 인앱 브라우저·iOS 백그라운드 대응을 정식 요구로 등록: 인앱 감지 시 "기본 브라우저로 열기" 안내, 재연결 안내 화면, 자동재생 거부 시 탭 재생 UI. 실기기 검증 항목화(미검증 표기).
2. 6명 mesh 한계를 NFR로 수치화하되 실측으로 확정: 인원별 해상도/비트레이트 상한, 적응형 하향, 측정 TC. TURN 릴레이 비율 계측과 대역폭 상한(할당량) 요구 포함.
3. coturn 보안을 SEC 요구로: 버전 4.9.0 이상, HMAC 임시 자격증명, 사설·루프백·IPv4-mapped IPv6 `denied-peer-ip`, 멀티캐스트 차단, 할당량, TLS 443 폴백 여부 결정. 그리고 getUserMedia 사용 시 로컬 IP 노출 고지 문구.
