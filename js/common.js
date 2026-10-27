// ================================================================
// 공통 모듈 - 모든 페이지에서 공유
// ================================================================

// ── 버전 ──────────────────────────────────────────────────────
// 화면 왼쪽 위 '딜 관리 시스템' 아래 배지에 표시됩니다.
// 시스템을 고칠 때마다 이 숫자를 올립니다.
//   작은 수정(버튼 위치, 글자, 버그 하나)   → 뒷자리 +1  (Beta-1.2 → Beta-1.3)
//   큰 변화(화면 추가, 기능 추가, DB 변경)  → 앞자리 +1  (Beta-1.9 → Beta-2.0)
// 변경 내역은 아래 표에 한 줄씩 적어 둡니다.
//
//   Beta-13.4 2026-10-27  팀원 4명의 표시 이름을 한글로 통일. 저장 아이디·필터 값은 유지.
//   Beta-13.3 2026-10-27  공 낙하 가속·단계별 작은 반동·착지 시 감쇠 바운스 추가.
//                         드랍 공은 옆으로 포물선 이동하며 회색 전환 유지.
//   Beta-13.2 2026-10-27  참고 이미지의 둥근 5단 깔때기·유입 화살표 적용.
//                         공은 짙은 파랑으로 시작해 옆면을 벗어날 때 회색으로 전환.
//   Beta-13.1 2026-10-27  딜 퍼널 디자인: 기존 5단 역삼각형에 도트 표면·얇은 입체 테두리·고정 핀 추가.
//                         딜 구슬은 은색으로 정비. 집계·이동·클릭 동작은 유지.
//   Beta-13.0 2026-10-27  관리 화면(admin.html)에 "데이터 백업" 버튼 추가.
//                         Supabase 무료 요금제는 자동 백업을 지원하지 않아서
//                         (Database > Backups에서 직접 확인: "Free Plan does
//                         not include project backups"), deals·
//                         deal_stage_history·deal_notes·deal_files·
//                         deal_drafts 다섯 테이블을 JSON 파일 하나로 묶어
//                         내려받는 수동 백업 버튼을 만듦(`downloadBackup()`).
//                         로그인 사용자 권한(authenticated)의 SELECT만으로
//                         되므로 service_role 키 불필요. 현재 전체 데이터가
//                         1MB 미만이라(Supabase에서 실측) 첨부파일 실물은
//                         포함하지 않음(첨부 0건이라 지금은 필요 없었음).
//                         사용자가 매주 직접 눌러 로컬에 보관하는 루틴으로
//                         쓰기로 함. 마지막 백업 날짜는 그 브라우저의
//                         localStorage에만 남음(기기 간 동기화 안 됨, 참고용).
//                         화면 기능 추가라 앞자리 올림
//   Beta-12.1 2026-10-27  "대시보드랑 칸반보드랑 숫자가 다르다" 신고 확인·수정.
//                         1) 버그: Beta-11.8에서 반복 재생 루프를 없애며
//                         `funnelCycleTimer` 변수를 지웠는데, `loadFunnel()`의
//                         "이 기간에 딜 0건" 분기에 그 변수를 쓰는 줄이 하나
//                         남아 있었음(ReferenceError). 그 분기를 타는 순간
//                         "퍼널 불러오기 실패"로 보였던 원인. 그 줄 제거.
//                         2) 설계상 차이(버그 아님): 퍼널의 "접수 N건"은 접수
//                         단계를 한 번이라도 거친 누적 건수이고, 칸반의
//                         "접수" 컬럼은 지금 그 단계에 머물러 있는 건수만
//                         셈 — 실제 Supabase 데이터로 확인(접수 누적 20건 vs
//                         칸반 접수 컬럼 4건, 나머지는 다음 단계 진행 6건·
//                         드랍 10건). 두 숫자 다 맞지만 같은 "접수"라는 이름을
//                         써서 헷갈렸던 것. 퍼널 카드에 누적 건수라는 안내문과
//                         칸반 보드 링크를 추가해 명확히 함. 버그 수정 +
//                         화면 문구 추가라 뒷자리 +1
//   Beta-12.0 2026-10-27  단계·결과 명칭 변경: '패스' → '드랍'. STAGES·
//                         FINAL_RESULTS 등 common.js 상수, 딜 상세·목록·칸반·
//                         진행경과·주간보고 화면, 스키마 CHECK 제약, 명세서
//                         스크립트까지 전부 반영(패스_드랍_용어변경_SQL.sql로
//                         기존 DB 데이터도 함께 변경). pass_reason 등 DB 컬럼
//                         이름 자체는 내부 식별자라 그대로 둠(자산군 명칭
//                         변경 때와 같은 방식). 핵심 용어 변경 + DB 데이터
//                         변경이라 앞자리 올림. 같은 버전에서 퍼널 공
//                         애니메이션도 개선: 드랍된 딜의 공은 그 단계까지
//                         내려오다 깔때기 밖으로 튕겨나가 회색으로 멈추도록
//                         구분(getDealFunnelStats()의 dealBalls에 dropped
//                         플래그 추가, index.html의 funnelEjectSlot()·
//                         애니메이션 경로 분기, css/style.css에 dropped·
//                         landed 스타일과 튕기는 pop 효과 추가)
//   Beta-11.8 2026-10-27  공 애니메이션 두 가지 조정.
//                         1) 반복 재생 중단: 그동안은 공이 다 떨어지고 나면
//                         몇 초 뒤 전체를 지우고 처음부터 다시 떨어뜨렸는데,
//                         화면을 보고 있으면 거슬린다는 의견이라 화면이 뜰 때
//                         (또는 기간을 바꿀 때) 딱 한 번만 재생하고 멈추도록
//                         바꿈. funnelCycleTimer로 반복 예약하던 부분을 제거.
//                         2) 한 줄 정렬 → 무작위 흩뿌림: 한 단계에 쌓이는 공들을
//                         가지런한 격자로 세우지 않고, 그 띠 안에서 무작위
//                         위치를 뽑되 너무 겹치면 다시 뽑는 방식(거부 샘플링)
//                         으로 자연스럽게 흩어지도록 바꿈(funnelLandingSlots).
//                         화면 로직 수정이라 뒷자리 +1
//   Beta-11.7 2026-10-27  공에 마우스를 올려도 딜명 말풍선이 안 뜬다는 신고 수정.
//                         네이티브 title 속성은 뜨기까지 1초 안팎 걸리는데, 공이
//                         몇 초마다 통째로 다시 생기다 보니(Beta-11.3) 뜰 시간이
//                         빠듯해 못 보일 수 있었음. 직접 그린 말풍선(#funnelTooltip,
//                         CSS .funnel-tooltip)으로 바꿔 올리자마자 바로 뜨게 함.
//                         버그 수정이라 뒷자리 +1
//   Beta-11.6 2026-10-27  퍼널 공 하나하나를 실제 딜과 연결. getDealFunnelStats()가
//                         이제 집계(stages)뿐 아니라 딜별 목록(deals: id·딜명·
//                         도달 단계)도 함께 돌려주고, index.html은 이 목록으로
//                         공을 만들어 각 공에 그 딜의 id를 붙임. 공에 마우스를
//                         올리면 딜명이 뜨고(title 속성), 클릭하면 그 딜의
//                         상세화면(deal-detail.html?id=...)으로 이동. 공 배치
//                         방식(여러 줄로 쌓기 등)은 그대로. 화면 로직 수정이라
//                         뒷자리 +1
//   Beta-11.5 2026-10-27  퍼널 모양과 공 개수를 다시 손봄.
//                         1) 모양: 단계별 수치로 폭을 좁히던 방식을 버리고,
//                         데이터와 무관하게 깔끔한 역삼각형(위는 꽉 찬 폭,
//                         아래로 갈수록 일정하게 좁아져 꼭짓점까지)으로 고정.
//                         2) 공 개수: "공 10개 기준 정규화"를 버리고 실제
//                         이 기간 딜 전체 개수를 그대로 씀. 각 단계에 쌓이는
//                         공 개수도 실제 건수 차이 그대로(반올림 없음). 공이
//                         많으면 한 줄에 다 못 들어가므로 여러 줄로 쌓이게
//                         하고(funnelLandingSlots), 공이 많을 때 한 주기가
//                         너무 길어지지 않게 등장 간격을 자동으로 줄임. 화면
//                         로직 수정이라 뒷자리 +1
//   Beta-11.4 2026-10-27  퍼널 모양을 사용자가 올려준 참고 이미지(원뿔형, 안에
//                         글자 없는 깔끔한 색 띠)에 맞춰 수정. 띠 사이 간격을
//                         없애 끊김 없이 이어지게 하고, 마지막 띠(투자확정)는
//                         끝까지 좁아져 뾰족한 꼭짓점이 되도록 바꿈(이전엔 평평한
//                         사각형으로 끝남). 띠 안의 숫자 텍스트는 제거(오른쪽
//                         표에 이미 건수·비율이 있어 중복이라 뺌). 화면 로직
//                         수정이라 뒷자리 +1
//   Beta-11.3 2026-10-27  퍼널 그래픽을 더 꾸밈: 띠마다 세로 그라데이션·윗면
//                         하이라이트·그림자를 넣어 리본처럼 보이게 하고, 공이
//                         위에서 쏟아져 내려와 각 단계에 쌓이는 애니메이션 추가.
//                         실제 딜 수를 그대로 쓰면 수백 개가 되므로, 매번
//                         "공 10개" 기준으로 정규화해 실제 전환율만큼만 다음
//                         단계로 넘어가고 나머지는 그 단계에 쌓이게 함(반올림).
//                         기간을 바꾸면 이전 애니메이션은 멈추고 새로 시작.
//                         화면 로직 추가라 뒷자리 +1
//   Beta-11.2 2026-10-27  대시보드 레이아웃 조정: 통계 카드 4개(전체 딜·검토 중·
//                         투자확정·이번 달 신규)를 퍼널 카드 오른쪽에 1열 4행으로
//                         배치하고, 퍼널 카드는 가로를 줄임(8:4 비율). 화면 레이아웃
//                         수정이라 뒷자리 +1
//   Beta-11.1 2026-10-27  대시보드에 "딜 소싱 → 투자 전환 퍼널" 그래픽 추가. 접수부터
//                         투자확정까지 각 단계에 한 번이라도 도달한 딜 수를 단계
//                         이력(deal_stage_history) 기준으로 세어 깔때기 모양으로
//                         보여줌(현재 단계만 보면 중간에 패스된 딜의 과거 진행도가
//                         빠짐). 분기별/전체 기간 선택 가능. common.js에
//                         getDealFunnelStats() 등 추가, index.html에 그래픽 렌더링.
//                         화면 로직 추가라 뒷자리 +1
//   Beta-11.0 2026-10-27  텔레그램 접수 화면에 "비슷한 딜이 있어요" 중복 경고 추가.
//                         딜명을 기존 딜 전체(화면에서 숨긴 과거분 포함) + 다른
//                         대기중인 초안과 글자 2개씩 겹치는 정도(Dice 유사도)로
//                         비교해 50% 이상 겹치면 경고로 보여줌. AI가 자동으로
//                         막지는 않고 담당자가 보고 판단(기존 "AI는 초안만, 등록은
//                         사람이" 방식과 동일). 화면·공통함수 추가라 앞자리 올림
//   Beta-10.1 2026-10-27  딜 상세 '기본 정보'에 당사 검토금액 표시 추가
//                         (지금까진 투자조건 섹션 편집창에서만 보였음). 통화별
//                         단위(억/백만/천만)로 포맷하는 formatReviewAmount()를
//                         common.js에 추가. 화면 로직 추가라 뒷자리 +1
//   Beta-10.0 2026-10-27  자산군 명칭 변경: 'PE/VC'→'기업 Equity',
//                         '사모크레딧'→'기업 Debt' (분류 10종·순서는 그대로).
//                         common.js(ASSET_CLASSES·ASSET_COLOR), 텔레그램 봇
//                         AI 추출 enum, DB 제약, 엑셀이관 매핑, 데모데이터
//                         전부 반영. 기존 DB 데이터도 `자산군_용어변경_SQL.sql`
//                         로 함께 반영 완료. 화면 전역에 쓰이는 핵심 분류값
//                         변경 + DB 데이터 변경이라 앞자리 올림
//   Beta-9.5  2026-10-27  화면에 보여줄 딜 시작일 추가(config.js의
//                         DISPLAY_FROM_DATE = '2026-10-01'). 엑셀이관 과거
//                         247건을 목록·대시보드·칸반·진행경과·주간보고에서
//                         화면상으로만 숨김(DB 삭제 아님, 언제든 되돌릴 수
//                         있음). getDeals()에서 한 곳만 고쳐 전체 화면에
//                         일괄 적용. 화면 로직 수정이라 뒷자리 +1
//   Beta-9.4  2026-10-27  텔레그램 접수에 PPT(.pptx)·워드(.docx) 지원 추가.
//                         npm 패키지 없이 내장 zlib로 직접 압축을 풀어 글자만
//                         뽑아낸 뒤 텍스트로 분석(PDF·사진보다 저렴). 예전
//                         .doc/.ppt는 미지원. 비용 절감을 위해 /start에 "텍스트
//                         직접 입력" 양식 안내 추가, 파일 제출 시에도 짧게
//                         안내. 화면 변경 없음(서버 함수만 수정)이라 뒷자리 +1
//   Beta-9.3  2026-10-27  당사 검토금액 입력 단위를 통화별로 다르게: KRW=억,
//                         USD·EUR=백만, JPY=천만 (환율 환산은 안 함, 통화마다
//                         보통 쓰는 자릿수에 맞춘 것뿐). common.js의
//                         CURRENCY_UNIT 표 참고. 통화 바꾸면 입력칸은 비워짐
//                         (단위가 바뀌므로). 화면 로직 수정이라 뒷자리 +1
//   Beta-9.2  2026-10-27  딜 규모·당사 검토금액 입력을 억원 단위로 변경(기존엔 원 단위라
//                         9~10자리 숫자를 직접 입력해야 했음). deal-new.html,
//                         deal-detail.html(기본정보·투자조건), deal-drafts.html 전부
//                         적용. 저장값(DB, 원 단위)은 그대로라 뒷자리 +1
//   Beta-9.1  2026-10-27  텔레그램 접수에 PDF·사진 지원 추가(기존엔 텍스트만 가능).
//                         Claude에 파일을 document/image로 그대로 올려서 분석.
//                         화면 변경 없음(서버 함수만 수정)이라 뒷자리 +1
//   Beta-9.0  2026-10-26  텔레그램 딜 접수 추가: 담당자가 텔레그램 봇에게 메시지를
//                         보내면 AI가 딜 항목을 분석해 '초안'으로 저장하고
//                         (deal_drafts 테이블, api/telegram-webhook.js), 담당자가
//                         '텔레그램 접수' 화면에서 확인·수정 후 등록해야 실제 딜이
//                         생성됨(AI가 자동 등록하지 않음). 화면·테이블·서버 함수
//                         추가라 앞자리 올림
//   Beta-8.0  2026-10-26  투자조건 구조화 1단계: 투자수단·통화·검토금액·만기·
//                         기대수익률·투자논거·주요위험 추가. 1차검토 단계부터
//                         상세화면에 노출(접수 단계엔 숨김). 자산군 10종 분류는
//                         유지. deals 테이블 컬럼 추가라 앞자리 올림
//   Beta-7.1  2026-10-19  보안: 라이브 모드에서 seed-data.js(실제 딜 247건) 전송
//                         차단. 로그인 전 화면에서도 무조건 내려가고 있었음.
//                         더 안 쓰는 자동 마이그레이션 함수도 제거. 뒷자리 +1
//   Beta-7.0  2026-10-19  '주간보고' 화면 추가: 이번 주 신규접수·단계변경·결정·
//                         IC 결정대기·기한초과 다음액션을 한 화면에 모으고
//                         인쇄/PDF 내보내기 지원. 화면 추가라 앞자리 올림
//   Beta-6.1  2026-10-19  진행경과 기간 계산 정비: 엑셀이관 구간은 '기간 미상'
//                         으로 표시하고 계산에서 제외, 1일 미만은 시간 단위로
//                         표시, 투자확정·패스는 결정일에 경과 집계를 멈춤.
//                         화면 로직 수정이라 뒷자리 +1
//   Beta-6.0  2026-10-19  딜을 "패스"로 바꿀 때 사유(가격/구조/신용/한도/일정/
//                         기타)·상세메모·재검토 조건을 기록하도록 추가.
//                         deals 테이블 컬럼 추가라 앞자리 올림
//   Beta-5.0  2026-10-19  딜 "단계"와 별개로 "상태"(진행/외부회신 대기/보류/종결)
//                         추가. 상세·목록·칸반·대시보드 반영. deals 테이블
//                         컬럼 추가라 앞자리 올림
//   Beta-4.0  2026-10-19  딜별 "다음 액션·기한" 추가(담당자/기한/대기사유),
//                         대시보드에 '내가 처리할 딜'·'기한 임박·초과' 추가.
//                         deals 테이블 컬럼 4개 추가라 앞자리 올림
//   Beta-3.1  2026-10-19  첨부파일 다운로드 버튼 추가(없어서 올린 파일을 꺼낼 수
//                         없었음). 단계 이력·파일 삭제가 오류를 무시하던 문제 수정
//   Beta-3.0  2026-10-19  딜 목록에서 담당자 일괄 변경 (여러 건 선택 → 한 번에 지정).
//                         기능 추가라 앞자리 올림
//   Beta-2.0  2026-10-01  로그인 도입(Supabase Auth), 평문 비밀번호 제거,
//                         DB를 로그인 사용자 전용으로 잠금(RLS), XSS 이스케이프,
//                         관리 화면 분리. 화면 2개 추가 + DB 변경이라 앞자리 올림
//   Beta-1.2  2026-10-01  Supabase 연결, 실제 딜 247건 업로드, RLS 정책 적용
//   Beta-1.1  (이전)      데모 모드 기능 완성 (대시보드·목록·칸반·상세·진행경과)
const APP_VERSION = 'Beta-13.4';

// 상수 정의
const STAGES = ['접수', '1차검토', '심층검토', 'IC', '투자확정', '드랍'];
// 자산군 = 포트폴리오현황보고 '세부유형' 분류 (대체투자 → 주식 → 채권 순)
// 2026-10-27: 'PE/VC' → '기업 Equity', '사모크레딧' → '기업 Debt' 로 명칭 변경
// (기존 데이터도 함께 변경 — 자산군_용어변경_SQL.sql 참고). 분류 자체(10종)와
// 순서는 그대로입니다.
const ASSET_CLASSES = ['기업 Equity', '부동산', '인프라', '기업 Debt',
                       '상장주식', '메자닌/비상장', '공모주',
                       '원화채권', '해외채권', '기타'];
const INTAKE_CHANNELS = ['이메일', '카카오톡', '텔레그램', '기타'];
const FINAL_RESULTS = ['투자', '드랍', '보류'];
const UNASSIGNED = '미배정';   // 담당자 미지정 딜 (엑셀 이관분 등)

// 검토 상태: 단계(STAGES)와 별개로, 실제로 움직이고 있는지를 나타냅니다.
// 오래된 딜이 단계만으로는 '지금 멈춰 있는지' 구분되지 않는 문제를 막기 위함.
const REVIEW_STATUSES = ['진행', '외부회신 대기', '보류', '종결'];
const DEFAULT_REVIEW_STATUS = '진행';

const REVIEW_STATUS_BADGE = {
  '진행':        'bg-light text-dark border',
  '외부회신 대기': 'bg-warning text-dark',
  '보류':        'bg-secondary',
  '종결':        'bg-dark'
};

// 딜을 '드랍'으로 바꿀 때 고르는 사유 분류. 자유 메모(pass_reason_note)와
// 재검토 조건(reconsider_condition)은 별도 자유 입력 칸입니다.
// (2026-10-27: 단계명 '패스'→'드랍'으로 변경. DB 컬럼명 pass_reason·
//  pass_reason_note·상수명 PASS_REASONS는 내부 식별자라 그대로 둡니다.)
const PASS_REASONS = ['가격', '구조', '신용', '한도', '일정', '기타'];

// 투자조건(1단계, 공통 필드만). 자산별 추가 항목(담보·LTV, 보수·캐리 등)은
// 아직 구조화하지 않았고, '핵심 투자논거'·'주요 위험' 자유 텍스트로 대신합니다.
// 접수 단계에서는 안 보이고 1차검토 단계부터 상세화면에 노출됩니다.
const INVESTMENT_VEHICLES = ['대출', '사채', '보통주', '우선주', 'CB', '펀드지분', '기타'];
const CURRENCIES = ['KRW', 'USD', 'EUR', 'JPY', '기타'];

// 당사 검토금액 입력 단위 (통화별). 통화마다 보통 쓰는 금액 자릿수가 크게 달라
// (원화는 억 단위, 달러·유로는 백만 단위, 엔화는 환율 특성상 천만 단위가 편함)
// 입력칸에 쓰는 단위를 통화에 맞춰 바꿉니다. DB(review_amount)에는 항상 그
// 통화의 최소 단위(원/달러/유로/엔) 그대로의 정수가 저장됩니다 — 환율 환산은
// 하지 않습니다(이 시스템은 서로 다른 통화의 금액을 더하거나 비교하지 않음).
const CURRENCY_UNIT = {
  'KRW': { factor: 1e8, label: '억원' },
  'USD': { factor: 1e6, label: '백만달러' },
  'EUR': { factor: 1e6, label: '백만유로' },
  'JPY': { factor: 1e7, label: '천만엔' },
  '기타': { factor: 1,   label: '' },
};
function currencyUnit(currency) {
  return CURRENCY_UNIT[currency] || CURRENCY_UNIT['기타'];
}

const STAGE_BADGE = {
  '접수':    'bg-secondary',
  '1차검토': 'bg-primary',
  '심층검토':'bg-warning text-dark',
  'IC':      'bg-info text-dark',
  '투자확정':'bg-success',
  '드랍':    'bg-danger'
};

const ASSET_COLOR = {
  '기업 Equity': '#1a237e', '부동산':       '#2e7d32', '인프라':  '#e65100',
  '기업 Debt':   '#6a1b9a', '상장주식':     '#ad1457', '메자닌/비상장':'#f06292',
  '공모주':      '#8d6e63', '원화채권':     '#00695c', '해외채권':'#0097a7',
  '기타':        '#616161'
};

const RESULT_BADGE = {
  '투자': 'bg-success', '드랍': 'bg-danger', '보류': 'bg-warning text-dark'
};

// ── Demo 데이터 (localStorage 기반) ────────────────────────────
// 초기 데이터(DEMO_DEALS_SEED 등)는 js/seed-data.js 에 있습니다.
// (포트폴리오현황보고 엑셀 2026.1Q·2Q 딜 접수목록에서 이관)

// localStorage 초기화
function initDemoData() {
  if (!localStorage.getItem('deals_v3')) {
    localStorage.setItem('deals_v3', JSON.stringify(DEMO_DEALS_SEED));
  }
  if (!localStorage.getItem('notes_v3')) {
    localStorage.setItem('notes_v3', JSON.stringify(DEMO_NOTES_SEED));
  }
  if (!localStorage.getItem('stage_history_v3')) {
    localStorage.setItem('stage_history_v3', JSON.stringify(DEMO_STAGE_HISTORY_SEED));
  }
  if (!localStorage.getItem('files_v3')) {
    localStorage.setItem('files_v3', JSON.stringify([]));
  }
  if (!localStorage.getItem('deal_drafts_v1')) {
    localStorage.setItem('deal_drafts_v1', JSON.stringify(DEMO_DEAL_DRAFTS_SEED));
  }
}

function demoGet(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function demoSet(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function demoId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
}

// ── Supabase 클라이언트 ─────────────────────────────────────────
// Supabase 클라이언트는 페이지당 하나만 만듭니다.
// (여러 개 만들면 로그인 세션이 서로 덮어써서 로그인이 풀릴 수 있습니다.)
let _sb = null;
function getSB() {
  if (!_sb && !DEMO_MODE) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,      // 새로고침해도 로그인 유지
        autoRefreshToken: true,    // 토큰 만료 전 자동 갱신
        detectSessionInUrl: false
      }
    });
  }
  return _sb;
}

// ── 딜 CRUD ────────────────────────────────────────────────────

async function getDeals(filters = {}) {
  if (DEMO_MODE) {
    let deals = demoGet('deals_v3');
    // DISPLAY_FROM_DATE(config.js) 이전에 접수된 딜은 화면에서 숨깁니다
    // (DB 삭제 아님 — 과거 엑셀이관분을 목록·대시보드·주간보고 등에서 제외하기 위함)
    if (DISPLAY_FROM_DATE) deals = deals.filter(d => (d.intake_date || '') >= DISPLAY_FROM_DATE);
    if (filters.asset_class) deals = deals.filter(d => d.asset_class === filters.asset_class);
    if (filters.assigned_to) deals = deals.filter(d => d.assigned_to === filters.assigned_to);
    if (filters.current_stage) deals = deals.filter(d => d.current_stage === filters.current_stage);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      deals = deals.filter(d =>
        d.deal_name.toLowerCase().includes(q) ||
        (d.introducer_gp || '').toLowerCase().includes(q)
      );
    }
    return deals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  let q = getSB().from('deals').select('*').order('created_at', { ascending: false });
  if (DISPLAY_FROM_DATE) q = q.gte('intake_date', DISPLAY_FROM_DATE);
  if (filters.asset_class) q = q.eq('asset_class', filters.asset_class);
  if (filters.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
  if (filters.current_stage) q = q.eq('current_stage', filters.current_stage);
  if (filters.search) q = q.ilike('deal_name', `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

async function getDeal(id) {
  if (DEMO_MODE) {
    const deal = demoGet('deals_v3').find(d => d.id === id);
    return deal || null;
  }
  const { data, error } = await getSB().from('deals').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

// ── 딜 퍼널 통계 (Beta-11.1) ───────────────────────────────────────
// 대시보드의 "딜 소싱 → 투자 전환" 퍼널 그래픽에 씁니다. 접수부터
// 투자확정까지 각 단계에 '한 번이라도 도달한 적 있는' 딜 수를 셉니다.
// 현재 단계만 보면 안 되는 이유: 심층검토까지 갔다가 드랍된 딜도
// 심층검토 단계까지는 도달했던 걸로 쳐야 퍼널(깔때기)이 맞기 때문입니다.
// 그래서 현재 단계가 아니라 단계 이력(deal_stage_history)을 기준으로
// "도달한 가장 높은 단계"를 계산합니다. '드랍'은 도달 단계가 아니라
// 중간에 빠져나가는 결과라 퍼널 단계에서 뺍니다.
const FUNNEL_STAGES = ['접수', '1차검토', '심층검토', 'IC', '투자확정'];

function quarterOfDate(dateStr) {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), q: Math.floor(d.getMonth() / 3) + 1 };
}

function quarterDateRange(year, q) {
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

// 화면에 표시할 딜이 시작되는 시점(config.js의 DISPLAY_FROM_DATE, 없으면
// 2026-01-01)부터 이번 분기까지 분기 목록을 최신순으로 돌려줍니다.
// 대시보드의 기간 선택 드롭다운에 씁니다.
function listFunnelQuarters() {
  const startStr = DISPLAY_FROM_DATE || '2026-01-01';
  const startQ = quarterOfDate(startStr);
  const nowQ = quarterOfDate(new Date().toISOString());
  const list = [];
  let y = startQ.year, q = startQ.q;
  while (y < nowQ.year || (y === nowQ.year && q <= nowQ.q)) {
    list.push({ value: `${y}-Q${q}`, label: `${y}년 ${q}분기` });
    q++; if (q > 4) { q = 1; y++; }
  }
  return list.reverse();
}

// periodValue: 'all' 이거나 생략 시 전체 기간(DISPLAY_FROM_DATE 이후), '2026-Q4' 형식이면 해당 분기만.
async function getDealFunnelStats(periodValue) {
  let dateFrom = DISPLAY_FROM_DATE || null;
  let dateTo = null;
  let periodLabel = '전체 기간';
  if (periodValue && periodValue !== 'all') {
    const [yearStr, qStr] = periodValue.split('-Q');
    const { start, end } = quarterDateRange(Number(yearStr), Number(qStr));
    dateFrom = dateFrom && dateFrom > start ? dateFrom : start;
    dateTo = end;
    periodLabel = `${yearStr}년 ${qStr}분기`;
  }

  let deals;
  if (DEMO_MODE) {
    deals = demoGet('deals_v3');
    if (dateFrom) deals = deals.filter(d => (d.intake_date || '') >= dateFrom);
    if (dateTo) deals = deals.filter(d => (d.intake_date || '') <= dateTo);
  } else {
    let q = getSB().from('deals').select('id, deal_name, intake_date, current_stage');
    if (dateFrom) q = q.gte('intake_date', dateFrom);
    if (dateTo) q = q.lte('intake_date', dateTo);
    const { data, error } = await q;
    if (error) throw error;
    deals = data;
  }

  const total = deals.length;
  if (total === 0) {
    return { total: 0, periodLabel, stages: FUNNEL_STAGES.map(name => ({ name, count: 0, pct: 0 })), deals: [] };
  }

  const ids = deals.map(d => d.id);
  let historyRows;
  if (DEMO_MODE) {
    const idSet = new Set(ids);
    historyRows = demoGet('stage_history_v3').filter(h => idSet.has(h.deal_id));
  } else {
    historyRows = [];
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { data, error } = await getSB().from('deal_stage_history').select('deal_id, stage').in('deal_id', chunk);
      if (error) throw error;
      historyRows.push(...data);
    }
  }

  // 딜별로 도달한 가장 높은 단계. 이력에 없어도(기록이 조용히 실패했을 경우
  // 대비) 현재 단계는 최소한 반영되도록 둘 다 봅니다.
  const maxLevel = {};
  deals.forEach(d => { maxLevel[d.id] = FUNNEL_STAGES.indexOf(d.current_stage); });
  historyRows.forEach(h => {
    const idx = FUNNEL_STAGES.indexOf(h.stage);
    if (idx > (maxLevel[h.deal_id] ?? -1)) maxLevel[h.deal_id] = idx;
  });

  const stages = FUNNEL_STAGES.map((name, i) => {
    const count = ids.filter(id => (maxLevel[id] ?? -1) >= i).length;
    return { name, count, pct: Math.round((count / total) * 1000) / 10 };
  });

  // 공 애니메이션에서 공 하나하나를 실제 딜로 연결하기 위한 목록(Beta-11.6).
  // stopStage = 그 딜이 도달한 가장 높은 단계(0=접수 ... 4=투자확정).
  // dropped = '드랍'으로 처리된 딜인지(Beta-11.9) — 드랍된 딜은 공이 그
  // 단계까지 내려오다 깔때기 밖으로 튕겨나가는 애니메이션으로 구분해 보여줍니다.
  const dealBalls = deals.map(d => ({
    id: d.id,
    deal_name: d.deal_name,
    stopStage: Math.max(maxLevel[d.id] ?? 0, 0),
    dropped: d.current_stage === '드랍',
  }));

  return { total, periodLabel, stages, deals: dealBalls };
}

async function createDeal(data) {
  if (DEMO_MODE) {
    const deals = demoGet('deals_v3');
    const newDeal = { review_status: DEFAULT_REVIEW_STATUS, ...data, id: demoId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    deals.unshift(newDeal);
    demoSet('deals_v3', deals);
    await addStageHistory(newDeal.id, newDeal.current_stage || '접수', currentUserName());
    return newDeal;
  }
  const { data: created, error } = await getSB().from('deals').insert(data).select().single();
  if (error) throw error;
  await tryAddStageHistory(created.id, created.current_stage, currentUserName());
  return created;
}

async function updateDeal(id, data) {
  if (DEMO_MODE) {
    const deals = demoGet('deals_v3');
    const idx = deals.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Deal not found');
    deals[idx] = { ...deals[idx], ...data, updated_at: new Date().toISOString() };
    demoSet('deals_v3', deals);
    return deals[idx];
  }
  const { data: updated, error } = await getSB().from('deals').update(data).eq('id', id).select().single();
  if (error) throw error;
  return updated;
}

// 여러 딜의 담당자를 한 번에 바꿉니다.
// 한 건씩 updateDeal 을 247번 호출하면 요청이 247개라 느리고 중간에 실패하면
// 일부만 바뀝니다. 라이브 모드는 .in('id', ids) 로 한 번에 보냅니다.
async function bulkUpdateAssignee(ids, assignee) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;

  if (DEMO_MODE) {
    const deals = demoGet('deals_v3');
    const set = new Set(ids);
    let n = 0;
    const now = new Date().toISOString();
    deals.forEach(d => {
      if (set.has(d.id)) { d.assigned_to = assignee; d.updated_at = now; n++; }
    });
    demoSet('deals_v3', deals);
    return n;
  }

  // Supabase 는 한 요청에 담을 수 있는 id 개수에 실질적인 한계가 있으므로
  // 200개씩 나눠 보냅니다 (247건이면 2회).
  let n = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await getSB()
      .from('deals')
      .update({ assigned_to: assignee })
      .in('id', chunk)
      .select('id');
    if (error) throw error;
    n += (data || []).length;
  }
  return n;
}

// ── 텔레그램 딜 초안 (Beta-9.0) ──────────────────────────────────
// 텔레그램 봇이 받은 메시지를 AI가 분석해 만든 '초안'입니다. 초안을
// 만드는 쪽(api/telegram-webhook.js)은 service_role 키로 직접 DB에
// 쓰므로, 여기(브라우저)는 조회와 확인(등록/반려)만 합니다.
async function getDealDrafts(status) {
  if (DEMO_MODE) {
    const drafts = demoGet('deal_drafts_v1');
    const filtered = status ? drafts.filter(d => d.status === status) : drafts;
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  let q = getSB().from('deal_drafts').select('*').order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// 초안을 확인해 실제 딜로 등록합니다. dealData 는 담당자가 화면에서
// 고친 최종 값입니다(AI가 뽑은 값을 그대로 쓸 수도, 고칠 수도 있습니다).
async function confirmDraft(draftId, dealData) {
  const created = await createDeal(dealData);
  const now = new Date().toISOString();
  if (DEMO_MODE) {
    const drafts = demoGet('deal_drafts_v1');
    const idx = drafts.findIndex(d => d.id === draftId);
    if (idx !== -1) {
      drafts[idx] = { ...drafts[idx], status: '등록완료', created_deal_id: created.id,
        reviewed_by: currentUserName(), reviewed_at: now };
      demoSet('deal_drafts_v1', drafts);
    }
    return created;
  }
  const { error } = await getSB().from('deal_drafts')
    .update({ status: '등록완료', created_deal_id: created.id, reviewed_by: currentUserName(), reviewed_at: now })
    .eq('id', draftId);
  if (error) throw error;
  return created;
}

// 초안을 반려합니다 (딜로 만들지 않음). 사유는 선택 사항입니다.
async function rejectDraft(draftId, reason) {
  const now = new Date().toISOString();
  if (DEMO_MODE) {
    const drafts = demoGet('deal_drafts_v1');
    const idx = drafts.findIndex(d => d.id === draftId);
    if (idx !== -1) {
      drafts[idx] = { ...drafts[idx], status: '반려', reject_reason: reason || null,
        reviewed_by: currentUserName(), reviewed_at: now };
      demoSet('deal_drafts_v1', drafts);
    }
    return;
  }
  const { error } = await getSB().from('deal_drafts')
    .update({ status: '반려', reject_reason: reason || null, reviewed_by: currentUserName(), reviewed_at: now })
    .eq('id', draftId);
  if (error) throw error;
}

// ── 중복 딜 탐지 (Beta-11.0) ──────────────────────────────────────
// 텔레그램 접수 확인 화면에서 "비슷한 딜이 있어요"를 보여주기 위한 용도입니다.
// 자동으로 막지는 않습니다 — 이름이 비슷해도 실제로 다른 딜일 수 있어서,
// 최종 판단은 항상 담당자가 합니다(경고만 표시, confirmAsDeal을 가로막지 않음).

function normalizeDealName(s) {
  return (s || '').toLowerCase().replace(/[\s.,\-_()\[\]]/g, '');
}

// 글자를 2개씩 끊어 겹치는 비율을 봅니다(Dice 유사도). 띄어쓰기·괄호 표기가
// 달라도 같은 딜이면 대부분 꽤 높게 나옵니다. 완벽한 방법은 아니라서
// "경고"로만 쓰고 자동 차단에는 쓰지 않습니다.
function dealNameSimilarity(a, b) {
  a = normalizeDealName(a);
  b = normalizeDealName(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s) => { const g = []; for (let i = 0; i < s.length - 1; i++) g.push(s.slice(i, i + 2)); return g; };
  const ga = grams(a), gb = grams(b);
  const count = {};
  ga.forEach(g => count[g] = (count[g] || 0) + 1);
  let common = 0;
  gb.forEach(g => { if (count[g] > 0) { common++; count[g]--; } });
  return (2 * common) / (ga.length + gb.length);
}

// 중복 비교용으로 기존 딜을 가볍게 가져옵니다(필요한 열만).
// DISPLAY_FROM_DATE로 화면에서 숨긴 과거 딜도 포함합니다 — 화면에 안 보여도
// 실제로 있는 딜이라 중복 체크에서는 빼면 안 됩니다.
async function getDealsForDuplicateCheck() {
  const cols = ['id', 'deal_name', 'introducer_gp', 'current_stage', 'intake_date', 'assigned_to'];
  if (DEMO_MODE) {
    return demoGet('deals_v3').map(d => {
      const picked = {};
      cols.forEach(c => picked[c] = d[c]);
      return picked;
    });
  }
  const { data, error } = await getSB().from('deals').select(cols.join(','));
  if (error) throw error;
  return data;
}

// dealName과 비슷한 기존 딜·다른 대기중인 초안을 찾아 점수 높은 순으로 최대 3건 돌려줍니다.
// candidates: getDealsForDuplicateCheck() 결과, otherDrafts: 비교 대상(자기 자신은 뺀) 대기중인 초안 목록
function findSimilarDeals(dealName, candidates, otherDrafts, threshold = 0.5) {
  if (!dealName || !dealName.trim()) return [];
  const scored = [];
  (candidates || []).forEach(c => {
    const score = dealNameSimilarity(dealName, c.deal_name);
    if (score >= threshold) scored.push({ type: 'deal', score, ...c });
  });
  (otherDrafts || []).forEach(d => {
    const name = (d.parsed || {}).deal_name;
    const score = dealNameSimilarity(dealName, name);
    if (score >= threshold) scored.push({ type: 'draft', score, id: d.id, deal_name: name });
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

async function deleteDeal(id) {
  if (DEMO_MODE) {
    demoSet('deals_v3', demoGet('deals_v3').filter(d => d.id !== id));
    demoSet('notes_v3', demoGet('notes_v3').filter(n => n.deal_id !== id));
    demoSet('stage_history_v3', demoGet('stage_history_v3').filter(h => h.deal_id !== id));
    demoSet('files_v3', demoGet('files_v3').filter(f => f.deal_id !== id));
    return;
  }
  const { error } = await getSB().from('deals').delete().eq('id', id);
  if (error) throw error;
}

async function changeStage(dealId, newStage) {
  const prevDeal = await getDeal(dealId);
  if (!prevDeal) throw new Error('Deal not found');
  await updateDeal(dealId, { current_stage: newStage });
  await tryAddStageHistory(dealId, newStage, currentUserName());
}

// ── 단계 이력 ──────────────────────────────────────────────────

async function getStageHistory(dealId) {
  if (DEMO_MODE) {
    return demoGet('stage_history_v3')
      .filter(h => h.deal_id === dealId)
      .sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
  }
  const { data, error } = await getSB().from('deal_stage_history')
    .select('*').eq('deal_id', dealId).order('changed_at', { ascending: true });
  if (error) throw error;
  return data;
}

// 특정 시각 이후의 단계 변경 이력을 모든 딜에 걸쳐 가져옵니다 (주간 보고용).
async function getStageHistorySince(sinceISO) {
  if (DEMO_MODE) {
    return demoGet('stage_history_v3').filter(h => h.changed_at >= sinceISO);
  }
  const { data, error } = await getSB().from('deal_stage_history')
    .select('*').gte('changed_at', sinceISO).order('changed_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function addStageHistory(dealId, stage, changedBy) {
  if (DEMO_MODE) {
    const hist = demoGet('stage_history_v3');
    hist.push({ id: demoId(), deal_id: dealId, stage, changed_by: changedBy, changed_at: new Date().toISOString() });
    demoSet('stage_history_v3', hist);
    return;
  }
  const { error } = await getSB()
    .from('deal_stage_history')
    .insert({ deal_id: dealId, stage, changed_by: changedBy });
  // 예전에는 error 를 보지 않고 넘어갔습니다. 그러면 단계는 바뀌었는데 이력만
  // 빠져서, 진행경과 화면이 조용히 틀린 값을 보여줍니다.
  if (error) throw new Error('단계 이력 기록 실패: ' + error.message);
}

// 단계 이력 기록을 시도하되, 실패해도 '본래 작업'은 성공으로 둡니다.
// 단계 변경 자체는 이미 저장됐는데 여기서 예외를 던지면, 화면은 예전 단계로
// 되돌아간 것처럼 보이고 DB 와 어긋납니다(칸반 드래그에서 특히). 그래서
// 실패는 경고로만 알립니다.
async function tryAddStageHistory(dealId, stage, changedBy) {
  try {
    await addStageHistory(dealId, stage, changedBy);
    return null;
  } catch (err) {
    console.error(err);
    showToast(err.message + ' (단계 변경 자체는 저장되었습니다)', 'warning');
    return err.message;
  }
}

// ── 메모 ───────────────────────────────────────────────────────

async function getNotes(dealId) {
  if (DEMO_MODE) {
    return demoGet('notes_v3')
      .filter(n => n.deal_id === dealId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  const { data, error } = await getSB().from('deal_notes')
    .select('*').eq('deal_id', dealId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function createNote(dealId, text, author) {
  if (DEMO_MODE) {
    const notes = demoGet('notes_v3');
    const note = { id: demoId(), deal_id: dealId, note_text: text, author, created_at: new Date().toISOString() };
    notes.unshift(note);
    demoSet('notes_v3', notes);
    return note;
  }
  const { data, error } = await getSB().from('deal_notes').insert({ deal_id: dealId, note_text: text, author }).select().single();
  if (error) throw error;
  return data;
}

async function deleteNote(noteId) {
  if (DEMO_MODE) {
    demoSet('notes_v3', demoGet('notes_v3').filter(n => n.id !== noteId));
    return;
  }
  const { error } = await getSB().from('deal_notes').delete().eq('id', noteId);
  if (error) throw error;
}

// ── 파일 ───────────────────────────────────────────────────────

async function getFiles(dealId) {
  if (DEMO_MODE) {
    return demoGet('files_v3').filter(f => f.deal_id === dealId);
  }
  const { data, error } = await getSB().from('deal_files').select('*').eq('deal_id', dealId);
  if (error) throw error;
  return data;
}

async function uploadFile(dealId, file) {
  if (DEMO_MODE) {
    const files = demoGet('files_v3');
    const entry = {
      id: demoId(), deal_id: dealId, file_name: file.name,
      file_size: file.size, uploaded_by: currentUserName(),
      uploaded_at: new Date().toISOString(), file_path: null
    };
    files.push(entry);
    demoSet('files_v3', files);
    return entry;
  }
  // Storage 키(저장 경로)에는 원본 파일명을 쓰지 않습니다. 이유 두 가지:
  //  1) 한글·공백·특수문자가 든 파일명은 Storage 키로 거부되어 업로드가 실패했습니다.
  //  2) 파일명이 경로에 그대로 들어가면, 그 경로를 화면에 넣을 때
  //     따옴표 같은 문자가 섞여 들어갈 수 있습니다.
  // 화면에 보이는 이름은 file_name 칸에 원본 그대로 저장하므로 표시는 달라지지 않습니다.
  const ext  = (file.name.match(/\.([A-Za-z0-9]{1,10})$/) || ['', ''])[1].toLowerCase();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${dealId}/${Date.now()}_${rand}${ext ? '.' + ext : ''}`;
  const { error: uploadErr } = await getSB().storage.from('deal-files').upload(path, file);
  if (uploadErr) throw uploadErr;
  const { data, error } = await getSB().from('deal_files').insert({
    deal_id: dealId, file_name: file.name, file_path: path,
    file_size: file.size, uploaded_by: currentUserName()
  }).select().single();
  if (error) throw error;
  return data;
}

async function deleteFile(fileId, filePath) {
  if (DEMO_MODE) {
    demoSet('files_v3', demoGet('files_v3').filter(f => f.id !== fileId));
    return;
  }
  // 예전에는 두 호출의 error 를 보지 않았습니다. 저장소 삭제가 실패했는데도
  // 목록에서 사라지면(또는 반대로) 파일과 기록이 어긋납니다.
  if (filePath) {
    const { error: stErr } = await getSB().storage.from('deal-files').remove([filePath]);
    if (stErr) throw new Error('저장소에서 파일 삭제 실패: ' + stErr.message);
  }
  const { error } = await getSB().from('deal_files').delete().eq('id', fileId);
  if (error) throw new Error('파일 기록 삭제 실패: ' + error.message);
}

// 첨부파일 내려받기용 임시 주소를 만듭니다.
// 버킷이 비공개라 주소를 알아도 열리지 않습니다. 로그인한 사용자만 받을 수 있는
// 서명된 주소(기본 60초 유효)를 그때그때 만들어 씁니다.
//
// download 옵션에 원래 파일명을 넘기는 것이 중요합니다. 저장 경로에는
// 한글 파일명을 쓰지 않고 난수를 쓰기 때문에(위 uploadFile 참고), 이 옵션이
// 없으면 'a1b2c3.pdf' 같은 이름으로 내려갑니다.
async function getFileUrl(filePath, fileName) {
  if (DEMO_MODE) {
    throw new Error('데모 모드에서는 첨부파일이 실제로 저장되지 않아 내려받을 수 없습니다.');
  }
  if (!filePath) {
    throw new Error('이 첨부에는 저장 경로가 없어 내려받을 수 없습니다.');
  }
  const opts = fileName ? { download: fileName } : { download: true };
  const { data, error } = await getSB().storage
    .from('deal-files')
    .createSignedUrl(filePath, 60, opts);
  if (error) throw new Error('다운로드 주소 생성 실패: ' + error.message);
  return data.signedUrl;
}

// ── 유틸리티 ───────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-';
  const n = Number(amount);
  if (n >= 1e12) return `${(n/1e12).toFixed(1)}조원`;
  if (n >= 1e8)  return `${(n/1e8).toFixed(0)}억원`;
  if (n >= 1e4)  return `${(n/1e4).toFixed(0)}만원`;
  return `${n.toLocaleString()}원`;
}

// 당사 검토금액 표시용. deal_size(항상 원 단위)와 달리 review_amount는
// 저장된 통화(currency)의 최소 단위 그대로이므로 formatCurrency(원 단위
// 전용)를 못 쓰고, currencyUnit()으로 그 통화에 맞는 단위를 골라 보여줍니다.
function formatReviewAmount(deal) {
  if (!deal || !deal.review_amount) return '-';
  const unit = currencyUnit(deal.currency || 'KRW');
  const amt = deal.review_amount / unit.factor;
  const amtStr = Number.isInteger(amt) ? amt.toLocaleString() : amt.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit.label ? `${amtStr}${unit.label}` : `${amtStr} ${deal.currency || ''}`.trim();
}

// ── 다음 액션 기한 계산 ──────────────────────────────────────────

// 오늘과 날짜 문자열의 차이(일). 미래면 양수, 지났으면 음수, 오늘이면 0.
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.round((target - today) / 86400000);
}

function isOverdue(dateStr) {
  const d = daysUntil(dateStr);
  return d !== null && d < 0;
}

// 기한을 날짜 + 지남/임박 표시로 보여줍니다 (목록·칸반·대시보드·상세 공용).
// 인자는 날짜 값이고, formatDate()를 거치므로 별도 escape가 필요 없습니다.
function nextActionDueHTML(dueStr) {
  if (!dueStr) return '<span class="text-muted">-</span>';
  const d = daysUntil(dueStr);
  const label = formatDate(dueStr);
  if (d < 0)  return `<span class="text-danger fw-bold">${label} (${-d}일 지남)</span>`;
  if (d === 0) return `<span class="text-warning fw-bold">${label} (오늘)</span>`;
  if (d <= 3) return `<span style="color:#f57c00">${label} (${d}일 후)</span>`;
  return `<span>${label}</span>`;
}

// 목록·칸반에서 쓰는 다음 액션 한 줄 요약. 내부에서 escapeHtml 처리합니다.
function nextActionSummaryHTML(d) {
  if (!d.next_action) return '<span class="text-muted" style="font-size:12px">-</span>';
  return `<div style="font-size:12px">
    <div>${escapeHtml(d.next_action)}</div>
    <div class="text-muted">${nextActionDueHTML(d.next_action_due)}${d.next_action_owner ? ' · ' + escapeHtml(displayUserName(d.next_action_owner)) : ''}</div>
  </div>`;
}

function stageBadge(stage) {
  const cls = STAGE_BADGE[stage] || 'bg-secondary';
  return `<span class="badge ${cls}">${stage}</span>`;
}

function assetBadge(ac) {
  const col = ASSET_COLOR[ac] || '#616161';
  return `<span class="badge" style="background:${col}">${ac}</span>`;
}

function resultBadge(result) {
  if (!result) return '';
  const cls = RESULT_BADGE[result] || 'bg-secondary';
  return `<span class="badge ${cls}">${result}</span>`;
}

// review_status 가 없는 딜(이 기능 이전에 만들어진 데모 데이터 등)은
// '진행'으로 간주합니다. 라이브 DB는 컬럼에 NOT NULL DEFAULT 가 있어
// 항상 값이 채워져 있지만, 데모 모드(localStorage)는 그렇지 않을 수 있습니다.
function dealStatus(deal) {
  return (deal && deal.review_status) || DEFAULT_REVIEW_STATUS;
}

// review_status 는 드롭다운으로만 고르고 DB 제약으로도 막혀 있어 고정값만
// 들어옵니다(stageBadge 와 같은 이유로 자유 입력이 아니라 escape 불필요).
function statusBadge(status) {
  const s = status || DEFAULT_REVIEW_STATUS;
  const cls = REVIEW_STATUS_BADGE[s] || 'bg-secondary';
  return `<span class="badge ${cls}">${s}</span>`;
}

function showToast(message, type = 'success') {
  const existing = document.getElementById('_toast');
  if (existing) existing.remove();
  const icons = { success:'✓', danger:'✕', warning:'!' };
  const div = document.createElement('div');
  div.id = '_toast';
  div.className = `alert alert-${type} alert-dismissible`;
  div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;min-width:300px;box-shadow:0 4px 12px rgba(0,0,0,.15)';
  div.innerHTML = `<strong>${icons[type] || '!'}</strong> ${message}
    <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function getUrlParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ── 네비게이션 렌더링 ──────────────────────────────────────────

function renderNav(activePage) {
  const pages = [
    { id:'dashboard', label:'대시보드',   icon:'fa-chart-pie',      href:'index.html' },
    { id:'deals',     label:'딜 목록',    icon:'fa-list',           href:'deals.html' },
    { id:'kanban',    label:'칸반 보드',  icon:'fa-columns',        href:'deals.html?view=kanban' },
    { id:'portfolio', label:'진행경과',   icon:'fa-project-diagram', href:'portfolio.html' },
    { id:'report',    label:'주간보고',   icon:'fa-file-lines',     href:'weekly-report.html' },
    { id:'drafts',    label:'텔레그램 접수', icon:'fa-robot',       href:'deal-drafts.html' },
    { id:'new',       label:'새 딜 입력', icon:'fa-plus-circle',    href:'deal-new.html' },
  ];

  // 라이브는 초록, 데모는 노랑 + '데모' 표시. 둘 다 버전을 함께 보여줍니다.
  const modeLabel = DEMO_MODE
    ? '<span class="badge bg-warning text-dark">데모 ' + APP_VERSION + '</span>'
    : '<span class="badge bg-success">' + APP_VERSION + '</span>';

  const items = pages.map(p => `
    <li class="nav-item">
      <a href="${p.href}" class="nav-link ${activePage===p.id?'active':''}">
        <i class="fas ${p.icon} me-2"></i>${p.label}
      </a>
    </li>`).join('');

  const target = document.getElementById('sidebar');
  if (!target) return;
  target.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><i class="fas fa-briefcase"></i></div>
      <div>
        <div class="brand-title">딜 관리 시스템</div>
        <div class="brand-sub">${modeLabel}</div>
      </div>
    </div>
    <ul class="nav flex-column mt-3">${items}</ul>
    <div class="sidebar-footer">
      <i class="fas fa-user-circle me-2"></i>
      <span>&nbsp;</span>
    </div>`;

  // 로그인한 사람 이름과 로그아웃 버튼을 채웁니다.
  updateCurrentUserInSidebar();
}

// ── 로그인 관리 (Supabase Auth) ────────────────────────────────────
// [바뀐 점] 예전에는 users 테이블에서 비밀번호를 직접 비교하고,
// 로그인 성공 표시를 localStorage 에 남겼습니다. 그 표시만 흉내내면
// 로그인 없이 들어올 수 있었고, 비밀번호도 암호화 없이 저장돼 있었습니다.
// 이제는 Supabase Auth 가 비밀번호를 해시로 보관하고, 로그인하면
// 서버가 서명한 토큰(위조 불가)을 내려줍니다.

// HTML 특수문자 escape (사용자 이름 등을 화면에 넣을 때 사용)
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// 현재 페이지 파일명
function currentPageName() {
  return window.location.pathname.split('/').pop() || 'index.html';
}

// 로그인 화면에서 아이디만 입력한 경우 회사 메일 도메인을 붙여줍니다.
function toLoginEmail(input) {
  const id = String(input || '').trim();
  if (!id) return '';
  if (id.includes('@')) return id;
  if (typeof LOGIN_EMAIL_DOMAIN === 'string' && LOGIN_EMAIL_DOMAIN) {
    return id + '@' + LOGIN_EMAIL_DOMAIN;
  }
  return id;   // 도메인 미설정 → 그대로 보내고 Auth 가 형식 오류를 알려줍니다.
}

// ── 세션 캐시 ──
// Supabase 세션 조회는 비동기(await)라서, 화면을 그리는 함수에서 바로 쓰기
// 어렵습니다. 그래서 로그인 확인이 끝나면 여기에 담아두고 화면에서 꺼내 씁니다.
let _sessionUser = null;

// 세션에서 표시용 사용자 정보 만들기
function userFromSession(session) {
  if (!session || !session.user) return null;
  const u = session.user;
  const meta = u.user_metadata || {};
  const email = u.email || '';
  return {
    id: u.id,
    email: email,
    // 아이디: 메일 주소의 @ 앞부분 (예: dongmin.yang@... → dongmin.yang)
    username: meta.username || email.split('@')[0] || '',
    full_name: meta.full_name || meta.username || email.split('@')[0] || '',
    role: meta.role || 'user'
  };
}

// 현재 로그인한 사용자 (화면 표시용, 로그인 확인 이후에 값이 있습니다)
function getCurrentUser() {
  if (DEMO_MODE) {
    return { id: 'demo', email: '', username: '데모사용자', full_name: '데모사용자', role: 'user' };
  }
  return _sessionUser;
}

// 표시 이름만 한글로 변환합니다. 저장된 담당자·로그인 아이디는 유지합니다.
function displayUserName(value) {
  const names = {
    'dongmin.yang': '양동민',
    'seungjun.shin': '신승준',
    'minji.kim': '김민지',
    'sunghoon.yu': '유성훈'
  };
  return Object.prototype.hasOwnProperty.call(names, value) ? names[value] : value;
}

// 기록(메모 작성자, 단계 변경자, 첨부 업로더)에 남길 이름
function currentUserName() {
  const u = getCurrentUser();
  return (u && (u.username || u.full_name || u.email)) || UNASSIGNED;
}

// 서버에 저장된 세션 불러오기
async function getSession() {
  if (DEMO_MODE) return null;
  const sb = getSB();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return (data && data.session) || null;
}

// 로그인 수행 (login.html 에서 호출)
async function performLogin(idOrEmail, password) {
  if (DEMO_MODE) {
    return { success: true, user: getCurrentUser() };
  }
  const email = toLoginEmail(idOrEmail);
  if (!email || !password) {
    return { success: false, error: '아이디와 비밀번호를 모두 입력하세요' };
  }
  try {
    const { data, error } = await getSB().auth.signInWithPassword({ email, password });
    if (error) {
      // Auth 는 '아이디가 없음'과 '비밀번호가 틀림'을 구분해서 알려주지 않습니다.
      // 없는 아이디를 찾아내는 공격을 막기 위한 설계이므로 그대로 둡니다.
      const msg = /Invalid login credentials/i.test(error.message)
        ? '아이디 또는 비밀번호가 맞지 않습니다'
        : (/Email not confirmed/i.test(error.message)
            ? '메일 인증이 완료되지 않은 계정입니다. 관리자에게 문의하세요'
            : '로그인 실패: ' + error.message);
      return { success: false, error: msg };
    }
    _sessionUser = userFromSession(data.session);
    try { sessionStorage.removeItem('auth_redirect'); } catch (e) {}
    return { success: true, user: _sessionUser };
  } catch (err) {
    return { success: false, error: '로그인 중 오류: ' + err.message };
  }
}

// 로그아웃
async function performLogout() {
  _sessionUser = null;
  try {
    // 예전 방식이 남겨둔 흔적도 같이 지웁니다.
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('migration_done');
  } catch (e) { /* 저장소 접근 불가 시 무시 */ }
  if (!DEMO_MODE && getSB()) {
    try { await getSB().auth.signOut(); } catch (e) { /* 이미 만료된 세션 */ }
  }
  window.location.replace('login.html');
}

// 저장된 Auth 토큰이 있는지 빠르게(동기) 확인
// 화면이 깜빡이지 않도록 먼저 확인하고, 실제 유효성은 아래 guardPage 에서
// 서버에 물어봅니다. 토큰은 서버가 서명했기 때문에 흉내낼 수 없습니다.
function hasStoredSession() {
  try {
    // Supabase 는 'sb-<프로젝트>-auth-token' 이라는 이름으로 저장합니다.
    // 이름 규칙이 버전마다 조금씩 달라질 수 있으므로, 정확한 이름을
    // 추측하지 않고 저장소를 훑어봅니다. (이름을 잘못 맞히면 로그인한
    // 사람도 로그인 화면으로 되돌려 보내는 문제가 생깁니다.)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('sb-') === 0 && k.indexOf('auth-token') !== -1) return true;
    }
    return false;
  } catch (e) {
    // 저장소를 못 읽는 상황(시크릿 모드 등)에서는 막지 않고,
    // 아래 guardPage 가 서버에 직접 물어보게 둡니다.
    return true;
  }
}

// 페이지 진입 가드: 로그인하지 않았으면 로그인 화면으로 보냅니다.
async function guardPage() {
  if (DEMO_MODE) return true;
  if (currentPageName() === 'login.html') return true;

  const session = await getSession();
  if (!session) {
    _sessionUser = null;
    // 만료된 토큰이 저장소에 남아 있으면 매번 되돌려지므로 함께 정리합니다.
    try { await getSB().auth.signOut(); } catch (e) {}
    window.location.replace('login.html');
    return false;
  }
  _sessionUser = userFromSession(session);
  try { sessionStorage.removeItem('auth_redirect'); } catch (e) {}
  document.documentElement.style.visibility = '';
  updateCurrentUserInSidebar();
  return true;
}

// 사이드바에 현재 사용자 표시 업데이트
function updateCurrentUserInSidebar() {
  const user = getCurrentUser();
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  const label = user ? displayUserName(user.username || user.full_name || user.email) : '로그인 필요';
  footer.innerHTML =
    '<i class="fas fa-user-circle me-2"></i>' +
    '<span>' + escapeHtml(label) + '</span>' +
    '<button class="btn btn-sm btn-outline-secondary ms-auto" title="로그아웃" onclick="performLogout()">' +
    '<i class="fas fa-sign-out-alt"></i></button>';
}

// 수동 데이터 마이그레이션 (관리자용)
// [2026-10] 페이지가 열릴 때마다 자동으로 시도하던 버전은 없앴습니다.
// 최초 247건 업로드가 이미 끝난 뒤로는 호출할 때마다 deals 테이블에 데이터가
// 있는지부터 확인해 그냥 돌아가는 것뿐인데, 로그인 전 화면(anon)에서는 그
// 확인 쿼리 자체가 RLS에 막혀 매번 콘솔에 에러만 남겼습니다. 최초 업로드가
// 필요하면 이 아래 함수를 admin.html의 버튼으로 수동 실행하면 됩니다.
async function manualMigrateDataToSupabase() {
  if (DEMO_MODE) {
    alert('데모 모드에서는 마이그레이션을 수행할 수 없습니다.');
    return false;
  }

  if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT')) {
    alert('Supabase가 설정되지 않았습니다.');
    return false;
  }

  if (!confirm('247건의 딜 데이터를 Supabase로 업로드하시겠습니까?')) {
    return false;
  }

  try {
    const statusDiv = document.getElementById('migration-status');
    if (statusDiv) statusDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin me-2"></i>데이터를 업로드 중입니다... 잠깐 기다려주세요.</div>';

    const supabase = getSB();

    // deals 테이블에 데이터가 있는지 확인
    const { count: dealCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true });

    if (dealCount > 0) {
      if (statusDiv) statusDiv.innerHTML = '<div class="alert alert-warning">이미 ' + dealCount + '건의 데이터가 존재합니다. 건너뛰었습니다.</div>';
      return false;
    }

    // seed-data 로드
    const deals = DEMO_DEALS_SEED || [];
    const notes = DEMO_NOTES_SEED || [];
    const history = DEMO_STAGE_HISTORY_SEED || [];

    // deals 일괄 삽입
    if (deals.length > 0) {
      for (let i = 0; i < deals.length; i += 1000) {
        const chunk = deals.slice(i, i + 1000);
        const { error } = await supabase.from('deals').insert(chunk);
        if (error) throw error;
      }
    }

    // notes 일괄 삽입
    if (notes.length > 0) {
      for (let i = 0; i < notes.length; i += 1000) {
        const chunk = notes.slice(i, i + 1000);
        const { error } = await supabase.from('deal_notes').insert(chunk);
        if (error) throw error;
      }
    }

    // history 일괄 삽입
    if (history.length > 0) {
      for (let i = 0; i < history.length; i += 1000) {
        const chunk = history.slice(i, i + 1000);
        const { error } = await supabase.from('deal_stage_history').insert(chunk);
        if (error) throw error;
      }
    }

    if (statusDiv) {
      statusDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>데이터 마이그레이션 완료! ' + deals.length + '건의 딜이 업로드되었습니다. 페이지를 새로 고침해주세요.</div>';
    }
    return true;
  } catch (err) {
    const statusDiv = document.getElementById('migration-status');
    if (statusDiv) {
      statusDiv.innerHTML = '<div class="alert alert-danger"><i class="fas fa-exclamation-circle me-2"></i>마이그레이션 오류: ' + err.message + '</div>';
    }
    console.error('마이그레이션 오류:', err);
    return false;
  }
}

// ── 초기화 ────────────────────────────────────────────────────────
if (DEMO_MODE) initDemoData();

// 로그인하지 않은 사람이 주소를 직접 입력해 들어오는 것을 막습니다.
// (토큰이 아예 없으면 서버에 물어볼 것도 없이 바로 보냅니다.)
if (!DEMO_MODE && currentPageName() !== 'login.html') {
  if (!hasStoredSession()) {
    document.documentElement.style.visibility = 'hidden';
    // 로그인 화면과 이 페이지를 무한히 왕복하지 않도록 표시를 남깁니다.
    try { sessionStorage.setItem('auth_redirect', '1'); } catch (e) {}
    window.location.replace('login.html');
  } else {
    // 토큰이 있어도 만료·위조 여부를 Supabase 에 확인합니다.
    guardPage();
  }
}

// ※ 화면 쪽 가드는 '편의'입니다. 실제 자물쇠는 Supabase 의 RLS 입니다.
//   브라우저 개발자도구로 이 검사를 건너뛰어도, 로그인 토큰이 없으면
//   데이터베이스가 딜 데이터를 한 건도 내주지 않습니다.
//   그래서 '보안설정_SQL.sql' 실행이 반드시 필요합니다.
window.addEventListener('load', () => {
  updateCurrentUserInSidebar();
});
