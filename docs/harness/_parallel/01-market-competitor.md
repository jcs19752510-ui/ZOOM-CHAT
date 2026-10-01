# 01 조각: 시장·사회 동향 + 경쟁 서비스 (MeetLite 기획자가 2단계 기획서의 차별화·범위 결정에 쓰는 중간 산출물)

- 조사 시점: 2026-10-01 (WebSearch 기반). 공식 페이지(zoom/google/whereby/jitsi.org) 직접 열람은 네트워크 차단(EGRESS_BLOCKED)으로 실패했다. 아래 값은 검색 요약·2차 블로그 중심이며 "공식 원문 재확인 필요"이다.
- 조각 모드 산출물. 취합본 검증(규칙 B)은 하지 않았다.

## 2. 사회적/시장 동향 (조사 시점 2026-10-01)

| # | 내용 | 출처 | 신뢰도 |
|---|---|---|---|
| 1 | 글로벌 화상회의 시장 2025년 186.4억 달러 -> 2026년 203.2억 달러 -> 2034년 374.5억 달러, CAGR 7.9% (Fortune Business Insights 발표 수치를 인용한 검색 요약) | https://www.fortunebusinessinsights.com/industry-reports/video-conferencing-market-100293 | 시장조사사 추정치. 방법론 미확인 |
| 2 | 팬데믹 이후에도 재택+출근 혼합 근무가 이어져 화상회의 수요가 유지된다는 설명 | https://www.giikorea.co.kr/report/sky2035548-video-conferencing-market-size-share-growth.html (시장보고서 소개), https://www.inews24.com/view/1557410 (기사, 발행일 미확인) | 정성적. 수치 확인 필요 |
| 3 | 무료 플랜은 "3인 이상 그룹 회의에 시간 제한"이 업계 표준이다 (Zoom 40분, Meet 60분, Whereby 45분). 1:1은 무제한 | 3장 비교표 출처 참조 | 2차 출처 다수 일치 |
| 4 | Jitsi 공개 서버(meet.jit.si)는 2023-08-24부터 방 생성자에게 계정(Google/GitHub/Facebook)을 요구한다. 악용 신고 증가가 이유다. 참가자는 계정 불필요 | https://alternativeto.net/news/2023/8/jitsi-meet-will-require-an-account-authentication-for-room-creation-starting-august-24th , https://discuss.techlore.tech/t/jitsi-no-longer-supports-anonymous-room-creation/5343 | 중. jitsi.org 원문 열람 실패 |
| 5 | Google Meet은 2021-07 무제한 무료 정책을 종료하고 무료 Gmail 계정은 그룹 1시간으로 제한했다 | https://zdnet.co.kr/view/?no=20210714092303 | 중 (기사 제목 기준, 본문 미열람) |

해석(추정): 익명 방 생성은 악용(스팸/불법 콘텐츠) 때문에 대형 사업자도 철회한 사례가 있다. "로그인 없음" 비목표 노선과 충돌하는 운영 리스크이므로 방 생성 남용 방지는 타 축(보안/규제)과 연계해 확인이 필요하다.

확인하지 못한 것: 2025~2026 한국 화상회의 시장 규모, 한국 내 최신 점유율. 검색에서 최신 국내 통계를 찾지 못했다(아래 4장 참조).

## 3. 유사 서비스/경쟁 환경 (조사 시점 2026-10-01)

| 항목 | Zoom (Basic 무료) | Google Meet (개인 계정 무료) | Whereby (Free) | Jitsi Meet (meet.jit.si) |
|---|---|---|---|---|
| 최대 인원(무료) | 100명 | 100명 | 100명(2차 출처) | 권장 약 35명, 소프트캡 75(2차 출처). 공식 한도 확인 필요 |
| 시간 제한 | 3인 이상 40분, 1:1 무제한 | 3인 이상 60분, 1:1 최대 24시간 | 3인 이상 45분, 1:1 무제한. (일부 2차 출처는 "시간 제한 없음"이라 적어 상충. 공식 확인 필요) | 시간 제한 없음(2차 출처) |
| 로그인 요구 | 호스트 계정 필요(추정). 참가자 게스트 입장 가능 여부 확인 필요 | 방 생성은 Google 계정 필요. 참가자 익명 입장 가능 여부는 정책에 따라 다름, 확인 필요 | 호스트 계정 필요, 게스트는 다운로드·로그인 없이 링크 입장 | 방 생성자는 계정 필요(2023-08-24~), 참가자는 불필요 |
| 입장 방식 | 링크/회의 ID, 웹 클라이언트 또는 앱 | 링크/코드, 브라우저 | 고정 방 URL 링크 | 링크 |
| 설치 필요 | 앱 권장, 웹 입장 가능(세부 확인 필요) | 설치 불필요(브라우저) | 설치 불필요(브라우저) | 설치 불필요(브라우저), 모바일은 앱 권장 가능성(확인 필요) |
| 오픈소스/자체 호스팅 | 아니오 | 아니오 | 아니오(확인 필요) | 예. Apache 2.0, 자체 호스팅 가능 |
| 한국어 UI | 확인 필요 | 지원(한국어 고객센터 존재) | 확인 필요 | 확인 필요 |

출처:
- Zoom: https://www.zoom.com/en/products/virtual-meetings/features/free-video-conferencing/ , https://www.zoom.com/en/small-business/meetings/ (공식, 100명·40분), https://blog.ucstrategies.com/zoom-free-plan-limitations/ (1:1 무제한, 2차)
- Google Meet: https://support.google.com/meet/answer/7317473?hl=ko-GB (검색 요약에서 확인, 열람 실패), https://www.thesmartadvice.com/2026/02/google-meet-time-limit-participant-guide.html , https://www.avnation.tv/2025/11/04/understanding-the-google-meet-time-limit/ (2차)
- Whereby: https://www.capterra.com/p/182733/appear-in/ , https://whereby.com/blog/the-nine-best-free-video-conferencing-apps/ (공식 블로그, 검색 요약만 확인), https://www.instantvideocall.com/vs/whereby-alternative (경쟁사 마케팅 글, 중립성 낮음)
- Jitsi: https://jitsi.org/jitsi-meet/ , https://www.rock.so/blog/what-is-jitsi (Apache 2.0, ~35명 권장, 2차), https://jitsi.org/blog/authentication-on-meet-jit-si/ (열람 실패)

상충/한계 보고:
- Whereby 시간 제한: 45분(다수) vs "무제한"(일부 글). 하나로 확정하지 않았다.
- 모든 인원·시간 수치는 정책이 수시로 바뀌므로 기획서 인용 전 공식 페이지 재확인이 필요하다.
- 한국 로컬 링크형 서비스(네이버 웍스 미팅, 카카오 등)는 이번 조사에서 확인하지 못했다. 확인 필요.

MeetLite 위치(추정): 경쟁 4종은 모두 "3인 이상 시간 제한" 또는 "생성자 계정"의 제약이 있다. MeetLite는 계정 없이 방 생성, 시간 무제한(서버 부하 감당 가능 범위)이 가능하다면 차별점이 되나, 방당 6명 mesh 상한은 약점이다. 이 우위는 사용자 검증 전 가설이다.

## 4. 타깃 사용자층(한국 비전문가 개인·소규모 모임)의 최근 행동 변화/니즈

- 확인된 사실: 한국 협업·화상회의 앱 사용 통계는 2020-10 시점 자료만 찾았다. 줌 월간 이용자 304만 명(전년 대비 155배), 구글 미트 103만 명(와이즈앱 인용). 출처: https://www.sedaily.com/NewsVIew/1ZAD61QF2B , https://edaily.co.kr/News/Read?mediaCodeNo=257&newsId=01479286625964408 , https://www.madtimes.co.kr/news/articleView.html?idxno=6045 . 현재(2026) 상황으로 일반화하면 안 된다.
- 공공기관이 여전히 외산 화상회의 툴을 많이 쓴다는 기사 존재(날짜 미확인): https://www.digitaltoday.co.kr/news/articleView.html?idxno=495685
- 확인 필요: 2025~2026 한국 이용자의 최근 행동 변화(모바일 비중, iOS 비중, 앱 설치 거부감, 무료 시간 제한 불만)를 뒷받침하는 최신 통계를 찾지 못했다. 이하는 근거 있는 사실이 아니라 가설이다.
  - 가설 H1: 3인 이상 40~60분 제한이 모임 용도(스터디, 가족, 동호회)의 주된 불편이다. (경쟁사 제한 사실에서 도출, 사용자 불만 데이터는 미확인)
  - 가설 H2: 초대받는 쪽은 앱 설치·가입을 꺼린다. (링크 입장형 서비스가 존재한다는 점에서 추정, 한국 데이터 미확인)
  - 검증 방법 제안: 2단계에서 UAT 설문 또는 Wiseapp·오픈서베이 등 최신 리포트(유료일 수 있음)를 사용자가 확인.

## 타 축 참고

- 규제/법: 익명 방 생성 허용 시 악용(불법 콘텐츠, 스팸) 신고가 Jitsi 정책 변경의 직접 원인이었다. 운영자 책임·신고 대응·개인정보(IP 노출, 대기실 고지) 확인이 필요하다.
- 기술/LLM: 해당 축에서 WebRTC mesh의 실질 인원 한계(6명), iOS Safari 제약, TURN 비용 확인 필요. Jitsi 권장 약 35명은 SFU(JVB) 구조 수치로 mesh와 직접 비교 불가.
- 운영 규칙: 무료 플랜의 "3인 이상 시간 제한, 1:1 무제한" 규칙은 인원 수 변화(3인째 입장 시점) 때 타이머 시작/적용 방식이 달라질 수 있는 도메인 특이 케이스. 각사 동작 확인 필요.
- LLM 기능: 이번 축에서 해당 없음(MeetLite에 생성형 AI 기능 언급 없음).

## 2단계 기획서 시사점 (3개)

1. 포지셔닝: 경쟁사 무료 플랜의 공통 제약(3인 이상 시간 제한, 생성자 계정 요구)에 대해 "계정 없이 방 생성, 시간 제한 없음, 설치 없음, 6명 이하 소모임"을 핵심 약속으로 하되, 이는 가설이며 인원 6명 상한을 명시적으로 안내하는 정책(POL)이 필요하다.
2. 남용 대응 요구: 익명 방 생성은 Jitsi가 2023년에 철회한 선례가 있으므로, 방 생성 rate limit, 서버 방 수 상한, 신고/운영자 연락처를 정식 REQ로 등록하고 법적 확인 목록에 올린다.
3. 근거 부족 영역 표시: 한국 최신 사용자 통계와 경쟁사 공식 수치는 미확인이므로 기획서에서 "가정(A)"으로 등록하고 사용자 확인 목록·UAT에서 검증한다.
