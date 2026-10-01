# 01 동향 분석 (MeetLite 기획 담당이 2단계 기획서의 포지셔닝·요구 등록 범위를 결정하는 데 쓰는 문서)

- 문서명: 01-trend-analysis / 버전: v2 / 작성일: 2026-10-01 / 상태: 초안(검증 로그 참조) / 주도: ① 기획자 / 모드: 취합(조각 3종: `_parallel/01-market-competitor.md`, `01-regulation.md`, `01-tech-domain.md`)
- 변경 이력: v0 취합 초안 -> v1 1차 검증 결함 2건 반영 -> v2 2차 검증 결함 1건(시사점 개수) 반영. 상세는 verify-log_01-trend-analysis.md.
- 주의: 이 문서는 소급 적용(DEC-006)이다. 서비스는 이미 구현·검증되어 있고, 이 조사는 기획서 소급 정리와 출시 전 판단용이다.
- **고지: 이 문서는 법률 자문이 아니다.** 공개 전 한국 변호사 또는 개인정보위 등 공식 기관의 검토가 필요하다(7장 참조).
- 신뢰도 표기: 모든 외부 사실은 "출처 / 확인 수준"을 붙였다. 공식 원문 미열람 항목은 "확인 필요"로 남겼다.

## 1. 조사 범위와 기간

- 도메인: 설치·로그인 없이 링크로 입장하는 웹 화상회의(한국어 UI, 1인 운영, 방당 최대 6명 WebRTC mesh, 서버 1대).
- 타깃 사용자층: 한국의 비전문가 개인·소규모 모임(스터디, 가족, 동호회 등). 입력 계약상 타깃이 명시되지 않아 프로젝트 요약("링크 클릭 후 3번 조작으로 입장")에서 추정했다. **추정이며 사용자 확인 필요.**
- 조사 시점: 2026-10-01 (WebSearch 기반, 최신 출처는 2026-09-24 MDN 이슈).
- 조사 축 3개(병렬 P1): (a) 시장·경쟁, (b) 규제·법·개인정보, (c) 기술·도메인 운영규칙.
- 범위 외: 가격·수익화, 마케팅 채널, 해외 시장(한국어 서비스).
- **조사 한계(전 축 공통)**: 네트워크 차단(EGRESS_BLOCKED)으로 공식 원문(zoom.com, support.google.com, jitsi.org, law.go.kr, 일부 법률 사이트, coturn 가이드·CVE DB)을 직접 열람하지 못했다. 대부분의 값은 검색 요약·2차 자료다. 원문을 직접 열람한 것은 MDN 이슈 #30654뿐이다. 따라서 수치·조문·시행일은 전부 "원문 재확인 필요"로 본다.

## 2. 사회적/시장 동향 요약 (조사 시점 2026-10-01)

| # | 내용 | 출처 | 신뢰도 |
|---|---|---|---|
| 1 | 글로벌 화상회의 시장 2025년 186.4억 달러, 2026년 203.2억 달러, 2034년 374.5억 달러 전망, CAGR 7.9% | [Fortune Business Insights](https://www.fortunebusinessinsights.com/industry-reports/video-conferencing-market-100293) (검색 요약 인용) | 시장조사사 추정. 방법론 미확인 |
| 2 | 팬데믹 이후에도 재택+출근 혼합 근무로 수요 유지 | [GII Korea](https://www.giikorea.co.kr/report/sky2035548-video-conferencing-market-size-share-growth.html), [inews24](https://www.inews24.com/view/1557410) (발행일 미확인) | 정성적. 수치 미확인 |
| 3 | 무료 플랜은 "3인 이상 그룹 회의에 시간 제한, 1:1 무제한"이 업계 관행 (Zoom 40분, Meet 60분, Whereby 45분) | 3장 출처 | 2차 출처 다수 일치 |
| 4 | Jitsi 공개 서버(meet.jit.si)는 2023-08-24부터 방 생성자에게 계정(Google/GitHub/Facebook)을 요구. 악용 신고 증가가 이유. 참가자는 계정 불필요 | [AlternativeTo](https://alternativeto.net/news/2023/8/jitsi-meet-will-require-an-account-authentication-for-room-creation-starting-august-24th), [Techlore](https://discuss.techlore.tech/t/jitsi-no-longer-supports-anonymous-room-creation/5343) | 중. jitsi.org 원문 미열람 |
| 5 | Google Meet은 2021-07 무제한 무료 정책을 종료, 무료 계정 그룹 회의 1시간 제한 | [ZDNet Korea](https://zdnet.co.kr/view/?no=20210714092303) | 중(기사 제목 기준, 본문 미열람) |
| 6 | 모바일 WebRTC 제약이 지속: iOS Safari는 화면 잠금·백그라운드 시 WebRTC 중단, 웹에서 이를 허용하는 옵션 없음 | [Apple Forums 774239](https://developer.apple.com/forums/thread/774239), [WebKit bug 185448](https://bugs.webkit.org/show_bug.cgi?id=185448) | 검색 요약. iOS 27 변화 확인 필요 |

해석(추정): 익명 방 생성은 악용(스팸·불법 콘텐츠) 때문에 대형 사업자도 철회한 선례(#4)가 있다. MeetLite의 "로그인 없음" 노선과 충돌하는 운영 리스크이므로 방 생성 남용 방지와 신고 대응이 필요하다.

확인하지 못한 것: 2025~2026 한국 화상회의 시장 규모·점유율(최신 국내 통계 미발견).

## 3. 유사 서비스/경쟁 환경 (조사 시점 2026-10-01, 4개 비교)

| 항목 | Zoom (Basic 무료) | Google Meet (개인 무료) | Whereby (Free) | Jitsi Meet (meet.jit.si) |
|---|---|---|---|---|
| 최대 인원(무료) | 100명 | 100명 | 100명(2차 출처) | 권장 약 35명, 소프트캡 75(2차). 공식 한도 확인 필요 |
| 시간 제한 | 3인 이상 40분, 1:1 무제한 | 3인 이상 60분, 1:1 최대 24시간 | 3인 이상 45분, 1:1 무제한. **상충: 일부 2차 출처는 "제한 없음"** | 제한 없음(2차) |
| 로그인 요구 | 호스트 계정 필요(추정). 게스트 입장 여부 확인 필요 | 방 생성 Google 계정 필요. 참가자 익명 입장 확인 필요 | 호스트 계정 필요, 게스트는 링크 입장 | 생성자 계정 필요(2023-08-24~), 참가자 불필요 |
| 입장 방식 | 링크/회의 ID, 웹 또는 앱 | 링크/코드, 브라우저 | 고정 방 URL | 링크 |
| 설치 필요 | 앱 권장, 웹 가능(세부 확인 필요) | 불필요 | 불필요 | 불필요(모바일 앱 권장 가능성 확인 필요) |
| 오픈소스/자체 호스팅 | 아니오 | 아니오 | 아니오(확인 필요) | 예, Apache 2.0 |
| 한국어 UI | 확인 필요 | 지원(한국어 고객센터) | 확인 필요 | 확인 필요 |

출처:
- Zoom: [무료 화상회의](https://www.zoom.com/en/products/virtual-meetings/features/free-video-conferencing/), [소규모 사업](https://www.zoom.com/en/small-business/meetings/) (100명·40분, 검색 요약), [UC Strategies](https://blog.ucstrategies.com/zoom-free-plan-limitations/) (1:1 무제한, 2차)
- Google Meet: [지원 문서](https://support.google.com/meet/answer/7317473?hl=ko-GB) (열람 실패, 검색 요약), [thesmartadvice](https://www.thesmartadvice.com/2026/02/google-meet-time-limit-participant-guide.html), [avnation](https://www.avnation.tv/2025/11/04/understanding-the-google-meet-time-limit/) (2차)
- Whereby: [Capterra](https://www.capterra.com/p/182733/appear-in/), [Whereby 블로그](https://whereby.com/blog/the-nine-best-free-video-conferencing-apps/) (검색 요약), [instantvideocall](https://www.instantvideocall.com/vs/whereby-alternative) (경쟁사 마케팅 글, 중립성 낮음)
- Jitsi: [jitsi.org](https://jitsi.org/jitsi-meet/), [rock.so](https://www.rock.so/blog/what-is-jitsi) (2차)

상충·한계 보고:
- Whereby 시간 제한(45분 vs 무제한)은 하나로 확정하지 않았다.
- 모든 인원·시간 수치는 정책 변경이 잦아 기획서 인용 전 공식 페이지 재확인 필요.
- Jitsi 권장 35명은 SFU(JVB) 구조 수치로 MeetLite의 mesh와 직접 비교할 수 없다(기술 축 지적).
- 한국 로컬 링크형 서비스(네이버 웍스 미팅, 카카오 등)는 조사하지 못했다. **확인 필요.** 경쟁 환경의 한국 내 공백 여부는 단정할 수 없다.
- 인앱 브라우저 제약(7장 R-3)은 "설치 없이 링크 입장" 가치 제안의 공통 한계라 경쟁 비교 시 함께 고려한다.

MeetLite 위치(가설): 4종 모두 "3인 이상 시간 제한" 또는 "생성자 계정" 제약이 있다. 계정 없이 방 생성, 시간 무제한, 설치 없음은 차별점 후보이나 6명 mesh 상한은 약점이다. 사용자 검증 전 가설이다.

## 4. 타깃 사용자층의 최근 행동 변화/니즈

- 확인된 사실(오래됨): 한국 협업·화상회의 앱 자료는 2020-10 시점뿐이다. 줌 월간 이용자 304만 명(전년 대비 155배), 구글 미트 103만 명(와이즈앱 인용). 출처: [서울경제](https://www.sedaily.com/NewsVIew/1ZAD61QF2B), [이데일리](https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=01479286625964408), [매드타임스](https://www.madtimes.co.kr/news/articleView.html?idxno=6045). **2026 현재로 일반화하면 안 된다.**
- 공공기관의 외산 화상회의 툴 의존 기사(날짜 미확인): [디지털투데이](https://www.digitaltoday.co.kr/news/articleView.html?idxno=495685).
- 확인 필요: 2025~2026 한국 이용자의 행동 변화(모바일·iOS 비중, 설치 거부감, 시간 제한 불만) 최신 통계를 찾지 못했다. 아래는 근거 있는 사실이 아닌 **가설**이다.
  - H1: 3인 이상 40~60분 제한이 모임 용도의 주된 불편이다(경쟁사 제한 사실에서 도출, 불만 데이터 미확인).
  - H2: 초대받는 쪽은 앱 설치·가입을 꺼린다(링크 입장형 서비스 존재에서 추정, 한국 데이터 미확인).
  - H3(기술 축, 근거 없음): 카카오톡 링크 공유가 주요 유입 경로일 가능성이 높다. 카카오톡 인앱 브라우저의 카메라·마이크 동작 공개 자료는 없다(확인 필요). 사실이면 성공 기준(3조작 입장)에 직접 영향을 준다.
- 검증 방법 제안: UAT 설문, 또는 사용자가 Wiseapp·오픈서베이 등 최신 리포트 확인.

## 5. 관련 규제/정책/법적 이슈

> 이 서비스는 "조언·추천"형 규제 업종(금융·의료·법률·보험)이 아니므로 규칙 I의 인허가 조사 대상은 아니다. 그러나 개인정보(IP·채팅)와 통신 서비스 운영 책임이 있어 규칙 I의 정신(법령명·조항·출처 명시, 불확실하면 확인 필요, 법률 자문 권고)을 적용했다. **조문 번호는 학습 지식과 검색 스니펫 기준이며 모두 법제처 원문 확인 필요. 법률 자문이 아니다.**

### 5-1. 개인정보 보호법
- IP·닉네임·로그의 해당 여부: 법 제2조 제1호(결합 용이성). IP는 결합 가능성에 따라 개인정보로 평가될 수 있다는 의견이 많다. 출처: [보안뉴스](https://www.boannews.com/media/view.asp?idx=35078), [네플라](https://www.nepla.net/post/ip-%EC%A3%BC%EC%86%8C%EB%8A%94-%EA%B0%9C%EC%9D%B8%EC%8B%9D%EB%B3%84%EC%A0%95%EB%B3%B4%EC%9D%B8%EA%B0%80). 보수적 판단(추정): IP는 개인정보로 취급한다. 규제 조각은 이 서비스가 로그에 IP를 남기고 강퇴 차단에 IP 해시를 쓴다고 전제했다(구현 사실은 CLAUDE.md로 확인되지 않았으므로 2단계에서 코드·문서로 확인 필요). 그렇다면 "개인정보를 처리하지 않는다" 전제로 설계하면 안 된다. 단순 해시한 IPv4는 복원 가능하여 가명처리에 그칠 수 있다(추정, 확인 필요).
- 채팅: 서버 메모리에만 두고 방 소멸 시 삭제하면 보관 위험은 낮으나 처리 사실은 방침에 적어야 한다. 서버 로그에 채팅 본문이 남지 않는지 확인 필요.
- 영상·음성: P2P라 서버가 수집하지 않으나 TURN 릴레이 시 암호화 패킷을 중계한다. "처리" 해당 여부 확인 필요.
- 처리방침: 법 제30조(국외 이전 기재는 제28조의8 연계). 소규모 면제 규정 미확인. 수집 시 고지(제15조·제22조 계열), CPO 지정·연락처 공개(제31조)는 원문 확인 필요. **프로젝트의 "대기실 IP 노출 고지"는 참가자 간 노출 고지이며 법정 고지를 대체하지 못한다.** 출처: [law.go.kr](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334953) (스니펫, 원문 미열람).
- 2026 개정: 법률 제21445호가 2026-02-12 국회 통과, 2026-09-11 시행(오늘 기준 시행 후)이라는 자료가 다수. 내용: 유출 가능성 인지 시 통지·신고, '유출등'에 위조·변조·훼손 포함, 중대·반복 위반 과징금 상한 전체 매출액 10%, 일정 규모 이상 CPO 이사회 의결·ISMS-P. 출처: [법률신문](https://www.lawtimes.co.kr/news/articleView.html?idxno=217245), [Kim & Chang](https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=34176), [datalaw.kr](https://datalaw.kr/guides/pipa-2026-amendment/) (스니펫만). **불확실: 일부 자료의 "72시간 내 통지" 조항, 소규모 사업자 적용 여부는 미확인.** 1인 MVP의 ISMS-P·이사회 의무 비해당 가능성은 높아 보이나 기준 미확인.
- 국외 이전(제28조의8): 처리방침에 국외 이전 근거 기재 필요. 출처: [CaseNote](https://casenote.kr/%EB%B2%95%EB%A0%B9/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95/%EC%A0%9C28%EC%A1%B0%EC%9D%988), [개인정보 포털](https://www.privacy.go.kr/front/contents/cntntsView.do?contsNo=367). 쟁점(확인 필요): Google 공개 STUN 사용 시 사용자 브라우저의 IP가 Google(미국)에 전달되는 것이 운영자의 국외 이전인지 판단하지 못했다. 해외 클라우드 호스팅 시 로그 IP 보관도 쟁점. 배포 지역은 미정(CLAUDE.md 규칙 E).
- 14세 미만: 법 제22조의2(법정대리인 동의). 출처: [CaseNote](https://casenote.kr/%EB%B2%95%EB%A0%B9/%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4_%EB%B3%B4%ED%98%B8%EB%B2%95/%EC%A0%9C22%EC%A1%B0%EC%9D%982), [lawnb](https://lawnb.com/Info/ContentView?sid=L000011357_22X2_20230314). 회원가입이 없어 연령 확인 수단이 없다. 이 서비스에 동조항이 어떻게 적용되는지, "만 14세 이상" 문구가 동의를 대체하는지는 확인 필요.

### 5-2. 전기통신사업법
- 부가통신사업 신고: 법 제22조, 시행령 제30조 계열. 검색 스니펫상 자본금 1억원 이하 부가통신사업자는 신고 면제, 초과 시 1개월 내 신고. 출처: [KCIA 안내](https://kcia.or.kr/inc/down.php?dir=BOARD&file_name=202204_165024942787008_1.pdf&rename=%EB%B6%80%EA%B0%80%ED%86%B5%EC%8B%A0%EC%82%AC%EC%97%85+%EC%8B%A0%EA%B3%A0+%EC%A0%9C%EB%8F%84+%EC%95%88%EB%82%B4%EB%AC%B8.pdf), [CRMS](https://www.crms.go.kr/lay1/S1T54C59/contents.do), [시행령 제30조(lbox)](https://lbox.kr/v2/statute/%EC%A0%84%EA%B8%B0%ED%86%B5%EC%8B%A0%EC%82%AC%EC%97%85%EB%B2%95%EC%8B%9C%ED%96%89%EB%A0%B9/%EB%B3%B8%EB%AC%B8%20%3E%20%EC%A0%9C2%EC%9E%A5%20%3E%20%EC%A0%9C30%EC%A1%B0). **확인 필요: 화상회의가 부가통신사업인지 유권해석 미발견, 개인(자본금 개념 없음)·무료 서비스의 면제 여부, 2025~2026 개정.** 과기정통부·관할 전파관리소 문의 권고.
- 불법촬영물 등 유통방지 의무(제22조의5 계열, 학습 지식, 미검증): 규모 기준·해당성 확인 필요.
- 통신비밀보호법: IP 접속기록이 통신사실확인자료로 다뤄질 수 있다는 의견(위 IP 출처). 수사기관 요청 응대와 로그 보관 기간 법정 의무 여부는 확인 필요.

### 5-3. 정보통신망법: 불법 정보 신고·삭제
- 제44조의2(삭제요청), 제44조의3(임의적 임시조치): 공개 목적 정보에 대해 피해자가 삭제 요청하면 제공자가 조치·통지. 출처: [CaseNote 제44조의2](https://casenote.kr/%EB%B2%95%EB%A0%B9/%EC%A0%95%EB%B3%B4%ED%86%B5%EC%8B%A0%EB%A7%9D_%EC%9D%B4%EC%9A%A9%EC%B4%89%EC%A7%84_%EB%B0%8F_%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8_%EB%93%B1%EC%97%90_%EA%B4%80%ED%95%9C_%EB%B2%95%EB%A5%A0/%EC%A0%9C44%EC%A1%B0%EC%9D%982), [생활법령](https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=293&ccfNo=2&cciNo=1&cnpClsNo=1). 비공개 링크 방·비저장 채팅이 "공개 목적 정보"인지 확인 필요. 서버에 저장하지 않으면 삭제 대상이 없을 수 있다.
- 운영 권고(추정): 신고 채널, 방 폐쇄 도구, 수사 협조 절차, 로그 보관 기간 정책화. 14세 미만 접속 가능성 때문에 신고·차단 UX 중요도 상승.

### 5-4. 해외·기타
- GDPR 제3조(2): 역외 사업자는 EU 대상화(offering/monitoring) 시 적용. 출처: [EDPB 3/2018](https://edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf). 동적 IP는 식별 수단 보유 시 개인정보(CJEU Breyer C-582/14): [Inside Privacy](https://www.insideprivacy.com/international/cjeu-confirms-dynamic-ip-addresses-to-be-personal-data/). 한국어 UI·한국 대상이면 적용 가능성이 낮다고 추정하나 **확정 결론이 아니다.** 영어 UI·EU 마케팅 시 재검토. CCPA·일본·중국 등 타 관할은 미조사. 한국법 역외 적용(제6조 계열)도 원문 확인 필요.
- 오픈소스 라이선스·상표: 웹 출처를 확보하지 못했다. 체크포인트(학습 지식, 확인 필요): 프로젝트 라이선스 미정(미지정 공개 시 기본 모든 권리 유보), 전체 의존성 라이선스는 lockfile 스캔 필요(AGPL/GPL 유입 점검, 폰트·아이콘 포함), coturn 라이선스 확인, NOTICE 파일, "MeetLite" 상표 선행조사 미실시, Zoom 상표·로고·UI 복제 금지.

### 5-5. 앱스토어 등 플랫폼 정책
- 해당 없음(네이티브 앱이 비목표라 심사 대상 없음).

## 6. 도메인 운영 규칙/특이 케이스

화상회의 도메인에는 영업일·휴장·시차 같은 규칙이 **해당 없음**이다(실시간 통신이며 일/주 단위 마감·갱신 주기가 없다). 대신 아래 규칙이 이 도메인의 "일반 경계값 테스트로 발견되지 않는" 특이 케이스다.

| # | 규칙/특이 케이스 | 근거 | 확인 수준 |
|---|---|---|---|
| O1 | 무료 플랜 "3인째 입장 시점부터 시간 제한 적용, 1:1은 무제한" 규칙. 타이머 시작·인원 감소 시 해제 방식은 업체마다 다를 수 있다. MeetLite는 시간 제한이 없는 설계(가설)이나 방당 6명 정원 도달·초과 시의 동작이 이에 대응하는 핵심 규칙 | 3장 출처, 각사 동작 확인 필요 | 확인 필요 |
| O2 | iOS Safari: 화면 잠금·백그라운드 시 WebRTC 중단(우회 불가). 복귀 시 재연결(ICE restart·재입장) 필요 | Apple Forums 774239, WebKit 185448 | 검색 요약. iOS 27 변화 확인 필요 |
| O3 | 자동재생 정책: 원격 `<video>`는 `playsinline`(필요 시 `muted`), `play()`가 `NotAllowedError`로 거부될 수 있어 "탭하여 재생" 필요 | [webrtcHacks](https://webrtchacks.com/autoplay-restrictions-and-webrtc/), [Apple Forums 133254](https://developer.apple.com/forums/thread/133254) | 검색 요약 |
| O4 | 인앱 브라우저(WKWebView 등)는 getUserMedia 제한 이력(iOS 14.3~, 오디오 요청 시 NotAllowedError 사례). 카카오톡·인스타그램 개별 동작은 자료 없음 | [Apple Forums 699479](https://developer.apple.com/forums/thread/699479), [670322](https://developer.apple.com/forums/thread/670322) | 실기기 검증 필요 |
| O5 | 화면공유: 모바일은 historically `getDisplayMedia` 미지원. 2026-09-24 MDN 이슈에 "iOS 27.0 Safari에서 피커 열림" 단일 보고(미해결). 기능 탐지로만 버튼 노출 판단, UA 스니핑 금지. "데스크톱만" 정책은 유지, iOS 27은 후속 검증 | [MDN BCD #30654](https://github.com/mdn/browser-compat-data/issues/30654) (직접 확인) | 단일 보고, 신뢰도 낮음 |
| O6 | 보안 컨텍스트: getUserMedia는 HTTPS(및 localhost)에서만 동작 | [PSA](https://groups.google.com/g/discuss-webrtc/c/QUdwwa-83K8) | 검색 요약 |
| O7 | 로컬 IP 노출: Chrome 76+의 mDNS 마스킹은 getUserMedia 권한이 있는 사이트는 제외, 같은 방 참가자에게 사설 IP가 노출될 수 있음(대기실 고지 근거) | [discuss-webrtc PSA](https://groups.google.com/g/discuss-webrtc/c/6stQXi72BEU) | 검색 요약, 최신 버전 확인 필요 |
| O8 | 6명 mesh: 참가자당 업·다운링크 (N-1) x 비트레이트, 6명이면 5개 동시 인코딩. 4~6명이 통설 한계이나 출처가 SFU 벤더 블로그(이해관계). 실제 한계는 자체 측정 필요 | [Ant Media](https://antmedia.io/webrtc-network-topology/), [Trembit](https://trembit.com/blog/how-many-participants-can-we-place-in-one-webrtc-peer-2-peer-room/), [nat.io](https://nat.io/blog/scaling-webrtc-applications) | 벤더 블로그. 모바일 발열은 추정 |
| O9 | TURN 필요 비율은 출처마다 15~20%, 20~30%, 기업망 40~60%로 상이(한국 수치 없음). 릴레이 시 서버 1대가 상·하향 모두 소화해 대역폭 병목 가능 | [NoJitter](https://www.nojitter.com/know-where-turn-when-deploying-webrtc), [100ms](https://www.100ms.live/blog/webrtc-turn-server), [Celloip](https://celloip.com/blog/webrtc-turn-server-production-guide/), [webrtcHacks](https://webrtchacks.com/usage-stats/) | 벤더 블로그. 상충(범위 상이)한 채 보고 |
| O10 | coturn 보안: `use-auth-secret`(HMAC 임시 자격증명), `denied-peer-ip`(사설·루프백·링크로컬), `no-multicast-peers`, 할당량(`user-quota`, `total-quota`, `max-bps`). CVE-2026-27624: IPv4-mapped IPv6로 `denied-peer-ip` 우회, 4.9.0에서 수정. 과거 CVE-2020-26262 | [EnableSecurity](https://www.enablesecurity.com/blog/coturn-security-configuration-guide/), [SentinelOne](https://www.sentinelone.com/vulnerability-database/cve-2026-27624/) | **원문 미열람. 옵션명·CVE·수정 버전 확인 필요** |
| O11 | UDP 차단망에서는 TURN TCP/TLS 443 폴백이 필요. 서버 1대에서 443을 웹과 공유할지는 설계 결정 | [WebRTC 그룹](https://groups.google.com/g/discuss-webrtc/c/bq2tUi_guE4) | 검색 요약 |
| O12 | 방 상태는 서버 메모리(CLAUDE.md 아키텍처 원칙): 서버 재시작 시 방·채팅 소멸 허용. 방 소멸 시점과 채팅 삭제·로그 로테이션 주기가 개인정보 보유기간 설명과 일치해야 한다(규제 축 지적) | CLAUDE.md, 규제 조각 | 프로젝트 내부 사실 |
| O13 | 한국 CGNAT·사내망 UDP 차단 비율: 한국 대상 공개 통계 없음 | 한국 수치는 추정조차 하지 않음 | 확인 필요 |
| O14 | 브라우저 폐기 예정 API: Chrome 151의 선언형 `<usermedia>` 요소 보도(2026-06-29, [Invide Labs](https://blog.invidelabs.com/chrome-usermedia-html-element/), 2차). getUserMedia 폐기 근거는 못 찾음. Firefox/Safari 최신 2개 버전의 WebRTC 폐기 예정은 조사 못함 | | 확인 필요 |

## 7. 리스크 및 불확실성

| ID | 리스크/불확실성 | 상태 |
|---|---|---|
| R-1 | **이 문서는 법률 자문이 아니다. 공개 전 한국 변호사 또는 개인정보위 상담 등 실제 법률 검토가 필요하다.** 에이전트가 법적 판단을 대신 내리는 것이 아니다. 법령 원문(law.go.kr)을 열람하지 못해 조문 번호·시행일·소규모 적용 범위는 모두 미확정이다 | 높음 / 미해소 |
| R-2 | 확인하지 못한 이유: 네트워크 차단(EGRESS_BLOCKED)으로 공식 사이트·법률 사이트·CVE DB·coturn 가이드 원문 열람 실패. 대부분 검색 스니펫·2차 블로그에 의존. 원문 열람은 MDN #30654 하나뿐 | 높음 / 재조사 필요 |
| R-3 | 인앱 브라우저(카카오톡 등) 미디어 불가 가능성은 "링크 클릭 후 3번 조작 입장" 성공 기준과 직접 충돌 가능. 공개 자료 없음, 실기기 검증 필요 | 높음 / 미검증 |
| R-4 | iOS 백그라운드 중단은 플랫폼 제약(확실). 재연결 UX로만 대응 가능 | 영향 큼 |
| R-5 | 6명 mesh 실질 한계와 TURN 릴레이 비율(한국 기준)을 몰라 서버 1대 대역폭 산정 불가. 근거는 벤더 블로그 | 자체 측정 필요 |
| R-6 | coturn 설정 오류·CVE-2026-27624는 내부망 접근(SSRF 유사)으로 이어질 수 있음. 원문 미확인 | 확인 필요 |
| R-7 | IP·IP 해시·로그의 개인정보 해당성. 비해당으로 가정하면 처리방침·보유기간·파기 의무 누락 | 보수적으로 해당 취급 |
| R-8 | 국외 이전 해당성(Google STUN, 해외 호스팅), 호스팅 지역은 규칙 E에 따라 사용자 승인 사항 | 확인 필요 |
| R-9 | 부가통신사업 신고 면제 요건(개인·무자본·무료) 불명, 불법촬영물 유통방지 의무 해당 여부 미검증 | 확인 필요 |
| R-10 | 2026-09-11 시행 개정 개인정보법의 소규모 사업자 적용, 유출 통지 기한("72시간" 언급) 불명 | 확인 필요 |
| R-11 | 14세 미만 접속 통제 수단 없음 | 정책 결정 필요 |
| R-12 | 익명 방 생성 남용(Jitsi 선례) | 대응 REQ 필요 |
| R-13 | 상표("MeetLite", Zoom 유사성)·의존성 라이선스·프로젝트 라이선스 미점검 | 확인 필요 |
| R-14 | 운영자 연락처·CPO·신고 채널 미정으로 법정 공개 항목을 채울 수 없음 | 사용자 결정 필요 |
| R-15 | 경쟁사 공식 수치(인원·시간·로그인·한국어 UI), 한국 로컬 경쟁 서비스, 한국 최신 사용자 통계 미확인 | 가정(A)으로 등록 |
| R-16 | 조각 간 상충·불일치(숨기지 않고 보고): (a) Whereby 시간 제한 45분 vs 무제한(시장 조각 내부 상충), (b) TURN 필요 비율 출처별 상이(기술 조각 내부), (c) LLM 해당 여부: 3개 조각 모두 "해당 없음"으로 일치하나 근거는 사용자 설명·프로젝트 문서에 AI 언급이 없다는 것뿐이며 CLAUDE.md 비목표 목록에 AI 기능이 명시되어 있지는 않다(8장 규칙 J 참조), (d) 규제 조각의 "IP 해시로 강퇴 차단" 전제는 CLAUDE.md에서 확인되지 않음. 조각 간 직접 모순은 발견하지 못했다 | 보고 |
| R-17 | 시장 규모 수치는 시장조사사 추정치로 방법론 미확인, 이 서비스의 의사결정에 직접 필요하지 않다 | 참고용 |

## 8. 2단계(기획서)에 특히 반영해야 할 시사점 (5개)

1. **[REQ 후보 · 법률 검토 게이트] 개인정보 처리방침·고지와 최소 수집·보유기간 정책(규칙 I 정신).** 수집 항목(닉네임, IP, IP 해시, 채팅), 목적, 보유기간(채팅=방 소멸 시, 로그·IP 해시=명시적 TTL, 솔트 적용), 파기, 국외 이전(STUN·호스팅), CPO·운영자 연락처, 권리 행사 방법, 유출 대응 절차를 입장 전 접근 가능하게 둔다. 로그에 IP·채팅·토큰·SDP를 남기지 않는 것은 CLAUDE.md와 정합. 근거: 5-1(제30조, 제28조의8, 2026 개정, 모두 원문 확인 필요). STUN 기본값을 Google 공개 서버에서 자체 coturn으로 바꾸는 안을 평가하고, 유지하면 제3자 IP 전달을 고지한다.
2. **[REQ 후보 · 법률 검토 게이트] 신고·차단·수사 협조 운영 규칙, 이용 연령·약관 정책.** 신고 채널, 방 폐쇄·강퇴·IP 차단 도구, 처리 기한, 수사기관 요청 응대, 로그 보관 기간, "만 14세 이상" 문구(확인 방식 포함). 부가통신사업 신고 요건 확인, 불법촬영물 유통방지 의무 해당성, 의존성 라이선스 스캔·NOTICE·프로젝트 라이선스·상표 점검을 Phase 7 출시 체크리스트의 **차단 항목**으로 둔다. 공개 전 실제 법률 자문. 근거: 5-2, 5-3, 5-4, R-1, R-9, R-11, R-13.
3. **[REQ 후보] 남용 방지 요구.** 익명 방 생성을 Jitsi가 2023년 철회한 선례(시장 #4)가 있으므로 방 생성 rate limit, 서버 방 수 상한, 신고 접수를 정식 REQ로 등록한다(CLAUDE.md 보안 규칙의 rate limit·방 수 상한과 연결).
4. **[REQ 후보] 모바일·인앱 브라우저·iOS 대응.** 인앱 감지 시 "기본 브라우저로 열기" 안내, 백그라운드 복귀 재연결 안내 화면, 자동재생 거부 시 탭 재생 UI, 화면공유는 기능 탐지 기반(데스크톱만 정책 유지, iOS 27은 후속 검증). 모두 실기기 검증 항목이며 현재 미검증으로 표기한다. 근거: 6장 O2~O5, R-3, R-4.
5. **[REQ/NFR 후보] mesh·TURN·coturn 보안 수치화.** 6명 mesh 해상도·비트레이트 상한과 적응형 하향은 실측으로 확정하는 NFR로 둔다. TURN 릴레이 비율 계측(개인정보 제외)과 할당량 요구를 포함한다. coturn은 4.9.0 이상(공식 릴리스 노트 확인 필요), HMAC 임시 자격증명, 사설·루프백·IPv4-mapped IPv6 `denied-peer-ip` 차단, 멀티캐스트 차단, TLS 443 폴백 여부 결정, 이를 검증하는 TC. 근거: 6장 O8~O11, R-5, R-6.

부가 지침(시사점 5개와 별도): 경쟁사 공식 수치, 한국 최신 사용자 통계, H1~H3는 기획서에서 가정(A)으로 등록하고 UAT·사용자 확인 목록에서 검증한다. 인원 6명 상한 안내 정책(POL)을 포함한다.

**규칙 J(AI/LLM 기능) 점검 결과: 해당 없음.** 사용자 설명과 프로젝트 요약(CLAUDE.md 제품 요약)에 챗봇·에이전트·RAG·자동 생성/추천 등 LLM 기능이 없고, 3개 조각 모두 해당 없음으로 보고했다. 따라서 프롬프트 인젝션 방어·출력 새니타이즈·도구 권한 최소화 REQ는 등록하지 않는다. 단 CLAUDE.md 비목표 목록에는 AI 기능이 명시되지 않으므로, 향후 AI 요약·자막 등이 요청되면 그 시점에 규칙 J를 재적용한다. 채팅은 사용자 입력이 다른 사용자에게 노출되지만 LLM 경유는 없다(XSS 방어는 기존 보안 규칙으로 처리).

## 5인 검토 (CLAUDE.md 규칙)

- ① 기획자 [우려]: 타깃·경쟁 수치가 가설·2차 출처 수준이라 포지셔닝은 UAT 전 확정 불가.
- ② 개발자 [우려]: 인앱 브라우저·iOS 27 동작을 실기기로 검증하지 못했다(미검증).
- ③ 디자이너 [통과]: 재연결·인앱 안내·재생 탭·IP 고지 등 상태 화면 요구가 시사점 4에 도출됨.
- ④ 아키텍트 [우려]: 서버 1대 TURN 대역폭·6명 mesh 한계가 실측 전이라 확장 한계 수치 미확정.
- ⑤ 보안 [우려]: coturn CVE·법령 원문 미열람. IP 해시 개인정보 취급과 법률 자문이 필요하다.
