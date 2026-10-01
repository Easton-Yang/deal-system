$ErrorActionPreference = "Continue"
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()
$sel = $word.Selection

# Colors: R + G*256 + B*65536
$NAVY   = 26 + 35*256 + 126*65536    # #1A237E
$NAVYLT = 232 + 234*256 + 246*65536  # #E8EAF6
$LGRAY  = 245 + 245*256 + 245*65536  # #F5F5F5
$WHITE  = 16777215
$BLACK  = 0
$GREEN  = 46 + 125*256 + 50*65536    # #2E7D32
$RED    = 198 + 40*256 + 40*65536    # #C62828
$DKGRAY = 97 + 97*256 + 97*65536     # #616161
$wdH1=(-2); $wdH2=(-3); $wdH3=(-4); $wdNormal=(-1)
$wdCenter=1; $wdLeft=0

# Page setup
$doc.PageSetup.LeftMargin   = $word.CentimetersToPoints(2.5)
$doc.PageSetup.RightMargin  = $word.CentimetersToPoints(2.5)
$doc.PageSetup.TopMargin    = $word.CentimetersToPoints(2.5)
$doc.PageSetup.BottomMargin = $word.CentimetersToPoints(2.5)

# Content width in points (A4 minus 2.5cm*2 margins = ~453pt)
$PW = 453

function resetPara {
    $sel.Style = $doc.Styles.Item($wdNormal)
    $sel.Font.Bold = $false; $sel.Font.Color = $BLACK
    $sel.Font.Size = 11; $sel.Font.Name = "맑은 고딕"
    $sel.ParagraphFormat.LeftIndent = 0
    $sel.ParagraphFormat.Alignment = $wdLeft
    $sel.ParagraphFormat.SpaceBefore = 3
    $sel.ParagraphFormat.SpaceAfter = 3
}

function wh1([string]$t) { resetPara; $sel.Style=$doc.Styles.Item($wdH1); $sel.TypeText($t); $sel.TypeParagraph(); resetPara }
function wh2([string]$t) { resetPara; $sel.Style=$doc.Styles.Item($wdH2); $sel.TypeText($t); $sel.TypeParagraph(); resetPara }
function wh3([string]$t) { resetPara; $sel.Style=$doc.Styles.Item($wdH3); $sel.TypeText($t); $sel.TypeParagraph(); resetPara }
function wp([string]$t,[bool]$b=$false) { resetPara; $sel.Font.Bold=$b; $sel.TypeText($t); $sel.TypeParagraph(); $sel.Font.Bold=$false }
function wb([string]$t) { resetPara; $sel.ParagraphFormat.LeftIndent=$word.CentimetersToPoints(0.8); $sel.TypeText([char]0x2022+" $t"); $sel.TypeParagraph(); $sel.ParagraphFormat.LeftIndent=0 }
function ws { resetPara; $sel.TypeParagraph() }
function wpb { $sel.InsertBreak(7) }

function setCell($tbl,$r,$c,[string]$txt,[long]$bg=-1,[long]$fg=0,[bool]$bold=$false,[bool]$ctr=$false) {
    $cell=$tbl.Cell($r,$c); $rng=$cell.Range
    $rng.Text=$txt; $rng.Font.Name="맑은 고딕"; $rng.Font.Size=10
    $rng.Font.Bold=$bold; $rng.Font.Color=$fg
    if($bg -ge 0){$cell.Shading.BackgroundPatternColor=$bg}
    if($ctr){$rng.ParagraphFormat.Alignment=$wdCenter}else{$rng.ParagraphFormat.Alignment=$wdLeft}
}

function mkt([int]$rows,[int]$cols,[int[]]$widths) {
    $t=$doc.Tables.Add($sel.Range,$rows,$cols)
    for($i=0;$i -lt $cols;$i++){$t.Columns($i+1).Width=[int]($PW*$widths[$i]/100)}
    return $t
}

function mat($t) {
    $endPos=$t.Range.End; $sel.SetRange($endPos,$endPos); $sel.MoveRight(1); resetPara; $sel.TypeParagraph()
}

# ── COVER PAGE ────────────────────────────────────────────────
resetPara; $sel.ParagraphFormat.Alignment=$wdCenter
1..6 | ForEach-Object { $sel.TypeParagraph() }
$sel.Font.Name="맑은 고딕"; $sel.Font.Size=28; $sel.Font.Bold=$true; $sel.Font.Color=$NAVY
$sel.TypeText("딜 접수·관리 시스템"); $sel.TypeParagraph()
$sel.Font.Size=16; $sel.Font.Bold=$false; $sel.Font.Color=$DKGRAY
$sel.TypeText("기능 요구사항 명세서 (FRD) — IT 개발팀 인계용"); $sel.TypeParagraph()
1..4 | ForEach-Object { $sel.TypeParagraph() }
$sel.Font.Size=12; $sel.Font.Color=$BLACK
@("버전: v1.0 (내부 VDI 배포용)","작성일: 2026년 9월 23일","작성부서: 자산운용팀","기밀 등급: 대외비 (투자 정보 포함)") | ForEach-Object { $sel.TypeText($_); $sel.TypeParagraph() }
1..3 | ForEach-Object { $sel.TypeParagraph() }
$sel.Font.Size=9; $sel.Font.Color=$DKGRAY
$sel.TypeText("본 문서는 딜 접수·관리 시스템 IT 개발을 위한 공식 요구사항 명세서입니다. IT 개발팀 외 무단 배포를 금지합니다."); $sel.TypeParagraph()
resetPara; wpb

# ── 1. 프로젝트 개요 ──────────────────────────────────────────
wh1 "1. 프로젝트 개요"
wh2 "1.1 목적"
wp "투자 딜(Deal) 접수 및 검토 프로세스를 디지털화하여 딜 누락 방지와 팀 내 검토 현황의 투명한 공유를 목적으로 합니다."
wh2 "1.2 현황 및 문제점"
wb "딜 제안이 이메일·카카오톡·텔레그램 등 채널에 분산 인입되어 통합 관리 불가"
wb "인입 딜이 누락되거나 담당자가 불분명한 경우 발생"
wb "검토 진행 현황을 팀 전체가 실시간 파악하기 어려움"
wb "딜 관련 파일(IM, 투자제안서 등)이 개인 PC에 분산 보관"
wh2 "1.3 기대 효과"
wb "딜 인입 즉시 등록으로 누락 제로화"; wb "단계별 진행 현황 팀 전체 실시간 공유"
wb "딜 검토 이력 및 의견 체계적 보관"; wb "향후 AI 자동 분류로 업무 효율 극대화"
wh2 "1.4 기술 스택"
$t1=mkt 5 3 @(20,35,45)
setCell $t1 1 1 "구분" $NAVY $WHITE $true $true; setCell $t1 1 2 "기술/서비스" $NAVY $WHITE $true $true; setCell $t1 1 3 "비고" $NAVY $WHITE $true $true
@(@("프론트엔드","HTML5/CSS3/JavaScript (Vanilla)","별도 설치 없이 브라우저에서 직접 실행"),
  @("데이터베이스","Supabase (PostgreSQL 15)","사내 서버 설치 (Self-hosted, Docker)"),
  @("차트","Chart.js 4.4.1","로컬 파일 포함 (vendor 폴더, 외부 인터넷 불필요)"),
  @("파일 스토리지","Supabase Storage","딜 관련 문서 저장 (IM, 제안서 등)")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $t1 $i 1 $_[0] $NAVYLT $NAVY $true; setCell $t1 $i 2 $_[1] $bg; setCell $t1 $i 3 $_[2] $bg; $i++
}
mat $t1
wh2 "1.5 프로토타입 현황"
wp "HTML/CSS/JS 기반 동작 프로토타입이 완성된 상태입니다. 본 프로토타입을 UI/UX 기준 레퍼런스로 사용하여 개발할 수 있습니다."
wb "프로토타입 파일: index.html / deals.html / deal-new.html / deal-detail.html / portfolio.html"
wb "데모 모드에서 실제 딜 247건(2026.1Q·2Q 딜 접수목록 이관)으로 전 기능 확인 가능"
ws; wpb

# ── 2. 사용자 및 권한 ─────────────────────────────────────────
wh1 "2. 사용자 정의 및 권한"
wh2 "2.1 사용자 유형"
$t2=mkt 3 3 @(22,25,53)
setCell $t2 1 1 "역할" $NAVY $WHITE $true $true; setCell $t2 1 2 "해당자" $NAVY $WHITE $true $true; setCell $t2 1 3 "설명" $NAVY $WHITE $true $true
setCell $t2 2 1 "팀장 (관리자)" $NAVYLT $NAVY $true; setCell $t2 2 2 "자산운용팀장"; setCell $t2 2 3 "전체 딜 조회·생성·수정·삭제, 담당자 변경, 모든 메모 삭제"
setCell $t2 3 1 "팀원 (일반)" $LGRAY $NAVY $true; setCell $t2 3 2 "유성훈, 양동민, 신승준, 김민지 중 팀장 외 팀원"; setCell $t2 3 3 "전체 딜 조회, 담당 딜 수정, 메모 작성 (삭제 제한)"
mat $t2
wh2 "2.2 권한 매트릭스"
$t3=mkt 9 3 @(52,24,24)
setCell $t3 1 1 "기능" $NAVY $WHITE $true $true; setCell $t3 1 2 "팀장" $NAVY $WHITE $true $true; setCell $t3 1 3 "팀원" $NAVY $WHITE $true $true
@(@("딜 목록 전체 조회","O","O"),@("새 딜 등록","O","O"),@("딜 정보 수정","O","담당 딜만"),
  @("딜 단계 변경","O","O"),@("딜 삭제","O","X"),@("메모 작성","O","O"),
  @("메모 삭제","O","자신의 메모만"),@("파일 업로드/삭제","O","O")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}
    setCell $t3 $i 1 $_[0] $bg
    $c1=if($_[1]-eq"O"){$GREEN}elseif($_[1]-eq"X"){$RED}else{$BLACK}
    $c2=if($_[2]-eq"X"){$RED}elseif($_[2]-eq"O"){$GREEN}else{$BLACK}
    setCell $t3 $i 2 $_[1] $bg $c1 $true $true; setCell $t3 $i 3 $_[2] $bg $c2 $false $true; $i++
}
mat $t3
wp "※ 사용자 인증 방식(Supabase Auth 또는 자체 로그인)은 IT 개발팀과 별도 협의 필요"
ws; wpb

# ── 3. 화면별 기능 요구사항 ───────────────────────────────────
wh1 "3. 화면별 기능 요구사항"
wh2 "3.1 대시보드 (index.html)"
wp "시스템 진입 시 최초 표시되는 홈 화면. 전체 딜 현황을 통계 카드·차트·최근 딜 목록으로 제공합니다."
$t4=mkt 7 3 @(25,50,25)
setCell $t4 1 1 "컴포넌트" $NAVY $WHITE $true $true; setCell $t4 1 2 "기능 설명" $NAVY $WHITE $true $true; setCell $t4 1 3 "비고" $NAVY $WHITE $true $true
@(@("통계 카드 ×4","전체 딜 수 / 검토 중(1차+심층+IC) / 투자확정 / 이번 달 신규 접수","클릭 → 해당 필터 목록 이동"),
  @("자산군별 도넛 차트","자산군별 딜 분포 시각화","Chart.js"),
  @("단계별 막대 차트","6개 단계별 딜 건수 시각화","Chart.js"),
  @("단계별 현황 요약","6개 단계 건수 표시, 클릭 → 필터된 목록 이동",""),
  @("최근 딜 목록","최대 8건, 딜명/자산군/담당자/딜규모/단계/인입일 표시","행 클릭 → 상세 이동"),
  @("새 딜 입력 버튼","우상단 고정","")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $t4 $i 1 $_[0] $bg $NAVY $true; setCell $t4 $i 2 $_[1] $bg; setCell $t4 $i 3 $_[2] $bg; $i++
}
mat $t4

wh2 "3.2 딜 목록 — 목록 뷰 (deals.html)"
$t5=mkt 6 3 @(28,45,27)
setCell $t5 1 1 "기능" $NAVY $WHITE $true $true; setCell $t5 1 2 "설명" $NAVY $WHITE $true $true; setCell $t5 1 3 "비고" $NAVY $WHITE $true $true
@(@("텍스트 검색","딜명/GP명 실시간 검색","대소문자 구분 없음"),
  @("자산군 필터","드롭다운: PE/VC, 부동산, 인프라, 사모크레딧, 상장주식, 메자닌/비상장, 공모주, 원화채권, 해외채권, 기타",""),
  @("단계 필터","드롭다운: 접수/1차검토/심층검토/IC/투자확정/패스",""),
  @("담당자 필터","드롭다운: 팀원 목록 + 미배정","엑셀 이관 딜은 미배정"),
  @("딜 삭제","행 우측 삭제 버튼, 확인 모달 후 삭제","삭제 후 복구 불가")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $t5 $i 1 $_[0] $bg $NAVY $true; setCell $t5 $i 2 $_[1] $bg; setCell $t5 $i 3 $_[2] $bg; $i++
}
mat $t5
wp "표시 컬럼: 딜명/GP명 · 자산군 · 인입경로 · 인입일 · 담당자 · 딜 규모 · 현재 단계 · 최종결과 · 삭제"

wh2 "3.3 딜 목록 — 칸반 뷰 (deals.html, 뷰 전환)"
$t6=mkt 5 2 @(30,70)
setCell $t6 1 1 "항목" $NAVY $WHITE $true $true; setCell $t6 1 2 "내용" $NAVY $WHITE $true $true
@(@("컬럼 구성","접수 / 1차검토 / 심층검토 / IC / 투자확정 / 패스 (6개 컬럼, 가로 스크롤)"),
  @("카드 표시 정보","딜명 · 자산군 배지 · 담당자 · 딜 규모 · 접수 경과일"),
  @("드래그&드롭","카드를 다른 컬럼으로 드래그 → 단계 변경 + 이력 자동 기록"),
  @("필터 연동","목록 뷰 필터(자산군/담당자/검색)가 칸반에도 동일 적용")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $t6 $i 1 $_[0] $bg $NAVY $true; setCell $t6 $i 2 $_[1] $bg; $i++
}
mat $t6

wh2 "3.4 새 딜 입력 (deal-new.html)"
wp "신규 딜 등록 폼. 저장 시 해당 딜의 상세 페이지로 자동 이동합니다."
$t7=mkt 11 5 @(22,10,13,31,24)
setCell $t7 1 1 "필드명" $NAVY $WHITE $true $true; setCell $t7 1 2 "필수" $NAVY $WHITE $true $true
setCell $t7 1 3 "유형" $NAVY $WHITE $true $true; setCell $t7 1 4 "선택항목/제약" $NAVY $WHITE $true $true; setCell $t7 1 5 "비고" $NAVY $WHITE $true $true
@(@("딜명 (프로젝트명)","필수","텍스트","최대 200자",""),
  @("자산군","필수","드롭다운","PE/VC, 부동산, 인프라, 사모크레딧, 상장주식, 메자닌/비상장, 공모주, 원화채권, 해외채권, 기타",""),
  @("인입경로","필수","드롭다운","이메일/카카오톡/텔레그램/기타",""),
  @("인입일자","필수","날짜","기본값: 오늘",""),
  @("담당자","필수","드롭다운","팀원 목록","기본값: 현재 사용자"),
  @("딜 규모","선택","숫자","원 단위, 한글 미리보기 표시","예: 50억원"),
  @("소개자/GP명","선택","텍스트","자유 입력",""),
  @("검토 단계","필수","버튼 선택","접수(기본)/1차검토/심층검토/IC/투자확정/패스","진행중 딜 등록 시"),
  @("1차 의견","선택","텍스트에어리어","자유 입력",""),
  @("초기 메모","선택","텍스트에어리어","저장 시 메모 탭 첫 항목으로 자동 등록","")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}
    setCell $t7 $i 1 $_[0] $bg
    $rc=if($_[1]-eq"필수"){$RED}else{$BLACK}; setCell $t7 $i 2 $_[1] $bg $rc $true $true
    setCell $t7 $i 3 $_[2] $bg; setCell $t7 $i 4 $_[3] $bg; setCell $t7 $i 5 $_[4] $bg; $i++
}
mat $t7
wp "유효성: 필수 항목 미입력 시 해당 필드 빨간 테두리 강조 + 오류 메시지 표시"
ws; wpb

wh2 "3.5 딜 상세 (deal-detail.html)"
wp "URL 파라미터 ?id={deal_id}로 특정 딜 조회 및 편집. 단계 변경·메모·파일 첨부 기능 포함."
$t8=mkt 7 3 @(20,52,28)
setCell $t8 1 1 "섹션" $NAVY $WHITE $true $true; setCell $t8 1 2 "기능 설명" $NAVY $WHITE $true $true; setCell $t8 1 3 "상호작용" $NAVY $WHITE $true $true
@(@("기본 정보","딜명·자산군·인입경로·인입일·담당자·딜규모·GP·최종결과 표시","'편집' 버튼 → 인라인 편집 폼 전환, 저장 즉시 반영"),
  @("단계 진행 바","6단계 가로 바. 완료=파랑, 현재=주황, 미진입=회색","클릭 → 확인창 후 단계 변경, 이력 자동 기록"),
  @("검토 메모","타임라인 형식, 작성자·날짜·내용 표시, 최신순 정렬","메모 입력 후 '추가' 클릭. 본인 메모 삭제 가능"),
  @("단계 이력","우측 사이드바, 단계 변경 기록 시간순 표시","자동 기록 (수동 추가 불가)"),
  @("파일 첨부","파일명·크기·업로더·일시 목록 표시","'파일 추가' 클릭 → 다중 선택 업로드, 삭제 버튼 제공"),
  @("최종 결과","기본 정보 편집 모드에서 수정","드롭다운: 투자/패스/보류")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $t8 $i 1 $_[0] $bg $NAVY $true; setCell $t8 $i 2 $_[1] $bg; setCell $t8 $i 3 $_[2] $bg; $i++
}
mat $t8

wh2 "3.6 딜 진행경과 (portfolio.html)"
wp "각 딜이 단계별로 소요한 기간을 가로 타임라인 막대로 시각화. 착수 딜의 진행 현황 파악에 활용합니다."
$t9=mkt 6 2 @(28,72)
setCell $t9 1 1 "기능" $NAVY $WHITE $true $true; setCell $t9 1 2 "설명" $NAVY $WHITE $true $true
@(@("타임라인 막대","단계별 소요일수를 비율에 따른 너비로 표시. 완료=파랑계열, 진행중=주황, 미진입=회색"),
  @("단계 필터 버튼","상단 버튼으로 특정 단계 표시/숨김 토글 (복수 선택 가능)"),
  @("담당자 필터","드롭다운으로 담당자별 필터링"),
  @("정렬","인입일 순 / 소요일 긴 순 / 현재 단계 순 선택"),
  @("카드 클릭","해당 딜 상세 페이지로 이동")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $t9 $i 1 $_[0] $bg $NAVY $true; setCell $t9 $i 2 $_[1] $bg; $i++
}
mat $t9
ws; wpb

# ── 4. DB 설계 ────────────────────────────────────────────────
wh1 "4. 데이터베이스 설계"
wh2 "4.1 테이블 관계"
wb "deals (1) → (N) deal_stage_history : 단계 변경 이력"
wb "deals (1) → (N) deal_notes : 검토 메모"
wb "deals (1) → (N) deal_files : 첨부 파일"
wp "딜 삭제 시 연관 이력·메모·파일 레코드 CASCADE DELETE 처리"
ws

wh2 "4.2 deals 테이블"
$tD1=mkt 14 4 @(24,18,24,34)
setCell $tD1 1 1 "컬럼명" $NAVY $WHITE $true $true; setCell $tD1 1 2 "타입" $NAVY $WHITE $true $true
setCell $tD1 1 3 "제약" $NAVY $WHITE $true $true; setCell $tD1 1 4 "설명" $NAVY $WHITE $true $true
@(@("id","UUID","PK, DEFAULT gen_random_uuid()","딜 고유 식별자 (자동생성)"),
  @("deal_name","TEXT","NOT NULL","딜명"),
  @("intake_channel","TEXT","NOT NULL","인입경로: 이메일/카카오톡/텔레그램/기타"),
  @("intake_date","DATE","NOT NULL","딜 최초 인입일자"),
  @("asset_class","TEXT","NOT NULL","자산군: PE/VC, 부동산, 인프라, 사모크레딧, 상장주식, 메자닌/비상장, 공모주, 원화채권, 해외채권, 기타"),
  @("assigned_to","TEXT","NOT NULL","담당자 이름"),
  @("deal_size","BIGINT","NULL 허용","투자 규모 (원 단위)"),
  @("introducer_gp","TEXT","NULL 허용","소개자 또는 GP명"),
  @("current_stage","TEXT","NOT NULL, DEFAULT '접수'","현재 검토 단계"),
  @("first_opinion","TEXT","NULL 허용","1차 검토 의견"),
  @("final_result","TEXT","NULL 허용","최종 결과: 투자/패스/보류"),
  @("created_at","TIMESTAMPTZ","DEFAULT NOW()","최초 등록 일시"),
  @("updated_at","TIMESTAMPTZ","DEFAULT NOW()","최종 수정 일시 (트리거 자동 갱신)")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $tD1 $i 1 $_[0] $bg -1 $true; setCell $tD1 $i 2 $_[1] $bg; setCell $tD1 $i 3 $_[2] $bg; setCell $tD1 $i 4 $_[3] $bg; $i++
}
mat $tD1

wh2 "4.3 deal_stage_history 테이블"
$tD2=mkt 6 4 @(24,18,30,28)
setCell $tD2 1 1 "컬럼명" $NAVY $WHITE $true $true; setCell $tD2 1 2 "타입" $NAVY $WHITE $true $true
setCell $tD2 1 3 "제약" $NAVY $WHITE $true $true; setCell $tD2 1 4 "설명" $NAVY $WHITE $true $true
@(@("id","UUID","PK, DEFAULT gen_random_uuid()","이력 고유 식별자"),
  @("deal_id","UUID","FK → deals(id) ON DELETE CASCADE","연관 딜 ID"),
  @("stage","TEXT","NOT NULL","변경된 단계명"),
  @("changed_at","TIMESTAMPTZ","DEFAULT NOW()","단계 변경 일시"),
  @("changed_by","TEXT","NULL 허용","변경한 사용자 이름")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $tD2 $i 1 $_[0] $bg -1 $true; setCell $tD2 $i 2 $_[1] $bg; setCell $tD2 $i 3 $_[2] $bg; setCell $tD2 $i 4 $_[3] $bg; $i++
}
mat $tD2

wh2 "4.4 deal_notes 테이블"
$tD3=mkt 6 4 @(24,18,30,28)
setCell $tD3 1 1 "컬럼명" $NAVY $WHITE $true $true; setCell $tD3 1 2 "타입" $NAVY $WHITE $true $true
setCell $tD3 1 3 "제약" $NAVY $WHITE $true $true; setCell $tD3 1 4 "설명" $NAVY $WHITE $true $true
@(@("id","UUID","PK, DEFAULT gen_random_uuid()","메모 고유 식별자"),
  @("deal_id","UUID","FK → deals(id) ON DELETE CASCADE","연관 딜 ID"),
  @("note_text","TEXT","NOT NULL","메모 내용 (줄바꿈 포함)"),
  @("author","TEXT","NOT NULL","작성자 이름"),
  @("created_at","TIMESTAMPTZ","DEFAULT NOW()","작성 일시")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $tD3 $i 1 $_[0] $bg -1 $true; setCell $tD3 $i 2 $_[1] $bg; setCell $tD3 $i 3 $_[2] $bg; setCell $tD3 $i 4 $_[3] $bg; $i++
}
mat $tD3

wh2 "4.5 deal_files 테이블"
$tD4=mkt 8 4 @(24,18,30,28)
setCell $tD4 1 1 "컬럼명" $NAVY $WHITE $true $true; setCell $tD4 1 2 "타입" $NAVY $WHITE $true $true
setCell $tD4 1 3 "제약" $NAVY $WHITE $true $true; setCell $tD4 1 4 "설명" $NAVY $WHITE $true $true
@(@("id","UUID","PK, DEFAULT gen_random_uuid()","파일 고유 식별자"),
  @("deal_id","UUID","FK → deals(id) ON DELETE CASCADE","연관 딜 ID"),
  @("file_name","TEXT","NOT NULL","업로드 원본 파일명"),
  @("file_path","TEXT","NULL 허용","Supabase Storage 저장 경로"),
  @("file_size","BIGINT","NULL 허용","파일 크기 (바이트)"),
  @("uploaded_by","TEXT","NULL 허용","업로드한 사용자 이름"),
  @("uploaded_at","TIMESTAMPTZ","DEFAULT NOW()","업로드 일시")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $tD4 $i 1 $_[0] $bg -1 $true; setCell $tD4 $i 2 $_[1] $bg; setCell $tD4 $i 3 $_[2] $bg; setCell $tD4 $i 4 $_[3] $bg; $i++
}
mat $tD4
wp "파일 실체(바이너리)는 Supabase Storage 버킷 'deal-files'에 저장. 경로 형식: {deal_id}/{timestamp}_{filename}"
ws; wpb

# ── 5. 비기능 요구사항 ────────────────────────────────────────
wh1 "5. 비기능 요구사항"
$tNFR=mkt 12 3 @(16,30,54)
setCell $tNFR 1 1 "구분" $NAVY $WHITE $true $true; setCell $tNFR 1 2 "요구사항" $NAVY $WHITE $true $true; setCell $tNFR 1 3 "세부 내용" $NAVY $WHITE $true $true
@(@("보안","통신 암호화","모든 HTTP 통신 HTTPS 적용 필수"),
  @("보안","접근 제어","Supabase Row Level Security(RLS) — 인증 사용자만 데이터 접근"),
  @("보안","기밀 보호","투자 딜 정보 = 대외비. 미인증 사용자 접근 완전 차단"),
  @("성능","페이지 로드","3G 이상 기준 2초 이내 (딜 100건 기준)"),
  @("성능","동시 접속","3~4명 동시 사용 지원, 향후 10명 확장 고려"),
  @("가용성","서비스 가동률","99.9% 이상 (Supabase SLA 기준)"),
  @("백업","데이터 백업","일 1회 자동 백업 (Supabase Point-in-Time Recovery)"),
  @("브라우저","지원 브라우저","Chrome / Edge / Safari 최신 2개 버전. IE 미지원"),
  @("화면","반응형","PC(1280px+) 최적화, 태블릿(768px+) 기본 지원"),
  @("파일","첨부 제한","단일 파일 최대 50MB. PDF/Excel/Word/PPT/ZIP 지원"),
  @("확장","AI 연동 구조","딜 데이터 REST API 접근 가능 구조 유지 (AI 연동 대비)")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $tNFR $i 1 $_[0] $NAVYLT $NAVY $true; setCell $tNFR $i 2 $_[1] $bg; setCell $tNFR $i 3 $_[2] $bg; $i++
}
mat $tNFR
ws; wpb

# ── 6. AI 연동 계획 ───────────────────────────────────────────
wh1 "6. 향후 AI 연동 계획"
$tAI=mkt 5 4 @(12,20,45,23)
setCell $tAI 1 1 "Phase" $NAVY $WHITE $true $true; setCell $tAI 1 2 "기능" $NAVY $WHITE $true $true
setCell $tAI 1 3 "설명" $NAVY $WHITE $true $true; setCell $tAI 1 4 "활용 기술" $NAVY $WHITE $true $true
@(@("Phase 1","현재 (완료)","HTML 프로토타입 기반 수동 딜 관리 시스템 운영","-"),
  @("Phase 2","자산군 자동 분류","딜명·GP 입력 시 Claude AI가 자산군 자동 추천","Claude API"),
  @("Phase 3","검토 의견 요약","메모 기반 핵심 요약, IC 보고서 초안 지원","Claude API"),
  @("Phase 4","딜 자동 수집","이메일·메신저 딜 제안 자동 감지·등록","Claude API + 메신저 API")) | ForEach-Object -Begin {$i=2} -Process {
    $bg=if($i%2-eq0){$LGRAY}else{$WHITE}; setCell $tAI $i 1 $_[0] $NAVYLT $NAVY $true $true; setCell $tAI $i 2 $_[1] $bg -1 $true; setCell $tAI $i 3 $_[2] $bg; setCell $tAI $i 4 $_[3] $bg; $i++
}
mat $tAI
wp "※ Phase 2부터 Anthropic Claude API 비용 발생 (사용량 기반 과금, Phase 2 수준 월 수만 원 내외 예상)"
ws; wpb

# ── 7. QA 체크리스트 ──────────────────────────────────────────
wh1 "7. QA 테스트 체크리스트"
wp "개발 완료 후 수행할 기능 검증 항목입니다. Pass/Fail 란에 결과를 기입하세요."

$qaSections = @(
  @{H="7.1 대시보드";I=@("통계 카드 4개가 실제 DB와 일치하는가","이번 달 신규 카드가 월 변경 시 정상 갱신되는가","자산군 도넛 차트가 정확한 비율로 표시되는가","단계별 막대 차트 건수가 정확한가","단계 요약 클릭 시 해당 필터 목록으로 이동하는가","최근 딜 목록 행 클릭 시 상세로 이동하는가")},
  @{H="7.2 딜 목록 — 목록 뷰";I=@("전체 딜이 인입일 최신순으로 표시되는가","검색어 입력 시 실시간 필터링되는가","자산군/단계/담당자 필터가 정상 동작하는가","초기화 버튼 클릭 시 모든 필터 해제되는가","행 클릭 시 딜 상세로 이동하는가","삭제 확인 모달이 표시되고 삭제 후 목록에서 제거되는가")},
  @{H="7.3 딜 목록 — 칸반 뷰";I=@("목록↔칸반 뷰 전환이 정상 동작하는가","6개 컬럼에 딜이 올바르게 배분되는가","카드 드래그&드롭으로 단계 변경이 되는가","단계 변경 후 이력 테이블에 기록되는가","카드 클릭 시 상세로 이동하는가","목록 뷰 필터가 칸반에도 적용되는가")},
  @{H="7.4 새 딜 입력";I=@("필수 항목 미입력 시 오류 강조 표시되는가","딜 규모 입력 시 한글 미리보기가 표시되는가","단계 버튼 선택이 정상 동작하는가","저장 성공 시 딜 상세로 이동하는가","저장된 딜이 목록에 즉시 반영되는가","초기 메모가 상세 페이지 메모 탭에 등록되는가")},
  @{H="7.5 딜 상세";I=@("딜 정보가 정확하게 표시되는가","현재 단계가 단계 바에서 강조 표시되는가","단계 바 클릭 시 확인창 후 단계 변경되는가","단계 변경 후 이력 탭에 자동 기록되는가","편집 저장 후 변경 내용이 즉시 반영되는가","메모 추가·삭제가 정상 동작하는가","파일 업로드·삭제가 정상 동작하는가")},
  @{H="7.6 딜 진행경과";I=@("모든 딜의 타임라인 막대가 표시되는가","단계별 소요일수가 정확하게 계산되는가","단계 필터 버튼이 정상 동작하는가","담당자 필터·정렬이 정상 동작하는가","카드 클릭 시 상세로 이동하는가")},
  @{H="7.7 공통/보안";I=@("미인증 사용자가 데이터에 접근할 수 없는가","HTTPS로만 접근 가능한가","다수 동시 접속 시 데이터 충돌이 없는가","Chrome/Edge/Safari 모두 정상 동작하는가")}
)

foreach($sec in $qaSections) {
    wh2 $sec.H
    $cnt=$sec.I.Count+1
    $tQ=mkt $cnt 3 @(8,68,24)
    setCell $tQ 1 1 "No." $NAVY $WHITE $true $true
    setCell $tQ 1 2 "테스트 항목" $NAVY $WHITE $true $true
    setCell $tQ 1 3 "결과 (Pass/Fail/N/A)" $NAVY $WHITE $true $true
    for($j=0;$j -lt $sec.I.Count;$j++){
        $r=$j+2; $bg=if($j%2-eq0){$LGRAY}else{$WHITE}
        setCell $tQ $r 1 ($j+1).ToString() $bg -1 $false $true
        setCell $tQ $r 2 $sec.I[$j] $bg
        setCell $tQ $r 3 "" $bg
    }
    mat $tQ; ws
}

# ── Header ────────────────────────────────────────────────────
$hdr=$doc.Sections(1).Headers(1).Range
$hdr.Text="딜 접수·관리 시스템 — 기능 요구사항 명세서 v1.0    |    자산운용팀 대외비"
$hdr.Font.Size=9; $hdr.Font.Color=$DKGRAY

# ── Save ──────────────────────────────────────────────────────
$out="C:\Users\infomax\OneDrive - PREED LIFE Co., Ltd\바탕 화면\딜접수,관리시스템\딜관리시스템_기능요구사항명세서_v1.0.docx"
$doc.SaveAs2($out)
Write-Host "OK:$out"
$doc.Close($false)
$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
