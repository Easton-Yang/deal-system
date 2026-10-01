# 딜 접수·관리 시스템: 작업 맥락 (Claude용)

이 파일은 Claude가 이 프로젝트를 이어서 작업할 때 먼저 읽는 인수인계 문서입니다.
2026-05 ~ 2026-09 회사 Windows PC에서 진행했고, 2026-09-30에 개인 맥북으로 이전했습니다.

## 사용자

- 투자회사(PREED LIFE) **자산운용팀장**이고 **개발 경험이 전혀 없습니다**.
- 쉬운 한국어로, 파일을 어디서 어떻게 여는지까지 단계별로 설명하세요. 개발 용어는 풀어서 씁니다.
- 팀원: 유성훈, 양동민, 신승준, 김민지. 이 중 누가 팀장인지는 **아직 확인하지 못했습니다**.
- 회사 자료를 개인 맥북으로 옮기는 것은 사용자가 회사 규정상 문제없다고 확인했습니다 (2026-09-30).

## 무엇을 만들었나

메일·카카오톡·텔레그램으로 들어오는 투자 딜을 접수하고 검토 단계를 관리하는 웹 시스템입니다.
빌드 도구와 프레임워크 없이 순수 HTML/CSS/JS로 만들었고, 백엔드는 Supabase(PostgreSQL)를 씁니다.

| 파일 | 역할 |
|---|---|
| `login.html` | 로그인 (Supabase Auth, 이메일+비밀번호) |
| `admin.html` | 관리 (데이터 업로드, 내 비밀번호 재설정) · 로그인 필수 |
| `index.html` | 대시보드 (통계 카드, Chart.js 도넛·막대, 최근 딜) |
| `deals.html` | 딜 목록: 목록 뷰 + 칸반 뷰(드래그로 단계 변경), `?view=kanban` |
| `deal-new.html` | 새 딜 입력 |
| `deal-detail.html` | 상세: 편집, 단계 바, 메모, 첨부, 단계 이력 |
| `portfolio.html` | 진행경과: 딜별 단계 소요일 타임라인 |
| `js/config.js` | DEMO_MODE, Supabase URL/KEY, TEAM_MEMBERS, LOGIN_EMAIL_DOMAIN |
| `js/common.js` | 상수, 데이터 접근 함수(데모=localStorage / 라이브=Supabase), 유틸, 사이드바 |
| `js/seed-data.js` | 데모 초기 데이터: 실제 딜 247건 (아래 참고) |
| `딜관리시스템_DB스키마.sql` | DB 스키마 원본 (패키지의 `02_db/01_schema.sql`과 동일) |
| `보안설정_SQL.sql` | **보안 잠금 SQL.** users 테이블 삭제 + RLS를 로그인 사용자 전용으로. 사용자가 Supabase SQL Editor에 붙여넣어 1회 실행 |
| `딜관리시스템_기능요구사항명세서_v1.0.docx` | IT 전달용 명세서 (`tools/windows/gen_frd.ps1`로 생성) |
| `IT전달패키지_v1.0/` | 내부 VDI 배포용 IT 전달 패키지 (아래 참고) |
| `딜접수목록관리_전달패키지_v1.0.zip` | 위 패키지를 압축한 파일 (사용자가 이름을 바꿈) |

HTML은 `config.js` → `seed-data.js` → `common.js` 순서로 스크립트를 불러옵니다. 루트의 HTML은 CDN(Bootstrap 5.3.2, Font Awesome 6.5.0, Chart.js 4.4.1, supabase-js 2)을 씁니다.

## 핵심 결정 사항 (바꿀 때 주의)

- **인증 = Supabase Auth** (2026-10-01 교체). 그 전에는 `users` 테이블에 **평문 비밀번호**가 들어 있었고
  읽기·쓰기가 모두 열려 있어 누구나 조회·변경할 수 있었습니다. 로그인 표시도 localStorage 값 하나뿐이라
  개발자도구로 흉내내면 통과됐습니다. 둘 다 제거했습니다.
  - 로그인: `performLogin()` → `supabase.auth.signInWithPassword()`. 비밀번호는 Auth가 해시로 보관합니다.
  - 페이지 보호: `common.js` 맨 아래에서 `hasStoredSession()`(동기, 빠른 차단) → `guardPage()`(서버 확인).
    `login.html`만 예외입니다. `admin.html`도 **보호 대상**입니다(예전 `checkLogin`은 예외로 뒀었음).
  - **화면 쪽 가드는 편의일 뿐, 실제 자물쇠는 RLS입니다.** `보안설정_SQL.sql`을 실행하지 않으면
    가드를 우회해 데이터를 그대로 가져갈 수 있습니다.
  - 무한 왕복 방지: 동기 판단과 서버 판단이 엇갈리면 `sessionStorage.auth_redirect` 표시로 한 번만
    되돌리고, 남은 세션을 정리해 다시 로그인하게 합니다. 토큰 키 이름은 추측하지 않고 저장소를 훑습니다.
  - `CURRENT_USER`와 `ADMIN_PASSWORD`는 **삭제**했습니다. 기록에 남는 이름은 `currentUserName()`
    (로그인한 사람)으로 바뀌었습니다. 되살리지 마세요.
  - 팀원 계정 추가·초기화는 Supabase 대시보드 → Authentication → Users에서만 합니다. 앱에는
    남의 비밀번호를 바꾸는 기능이 없습니다(있으면 안 됩니다).

- **데모 모드**: `DEMO_MODE = true`. 데이터는 브라우저 localStorage에 저장되고, 키는 `deals_v3`, `notes_v3`, `stage_history_v3`, `files_v3`입니다. **초기 데이터(seed)를 바꾸면 키 버전을 올려야** 기존 브라우저에도 새 데이터가 들어갑니다.
- **실제 딜 데이터**: 회사 엑셀 `포트폴리오현황보고_딜 접수목록 List 26.2Q.xlsx`(분기별 시트)의 2026.1Q(147건)와 2026.2Q(100건)를 옮겼습니다. 대외비 자료입니다.
  - 엑셀 열: No, Deal 접수일, 투자분류, 세부유형, 제목, 제안사, (1)~(5) 단계 표시, 검토진행단계. 합계는 169~170행에 있습니다.
  - 단계 매핑: (1)제안접수=접수, (2)초기검토=1차검토, (3)상세검토=심층검토, (4)투심위상정=IC, (5)투자집행=투자확정(최종결과 '투자'). 표시된 가장 높은 단계를 현재 단계로 봅니다.
  - 엑셀에 없는 값: 담당자 `미배정`, 인입경로 `기타`, 딜 규모 NULL. 단계 이력은 접수일에 1분 간격으로 기록했습니다(`changed_by = '엑셀이관'`). 그래서 진행경과 화면에서 지난 단계는 모두 1일로 보입니다.
  - 변환 스크립트: `tools/windows/import_excel.ps1` (Excel COM, Windows 전용). 결과물은 `js/seed-data.js`와 패키지의 `02_db/03_initial_data.sql`이며, 둘은 같은 UUID를 씁니다.
- **자산군 = 회사 '세부유형' 10종**: PE/VC, 부동산, 인프라, 사모크레딧, 상장주식, 메자닌/비상장, 공모주, 원화채권, 해외채권, 기타.
  - 목록은 `common.js`의 `ASSET_CLASSES`·`ASSET_COLOR`, SQL의 `chk_asset_class`, 명세서 스크립트 세 곳에 있습니다. **세 곳을 항상 함께 바꾸세요.**
- **단계**: 접수, 1차검토, 심층검토, IC, 투자확정, 패스.
- **담당자 없음**: `UNASSIGNED = '미배정'`(common.js). 목록·진행경과 필터와 상세 편집 드롭다운에 포함되어 있습니다. 편집할 때 첫 팀원으로 조용히 바뀌던 버그를 막기 위한 것입니다.

## IT 전달 패키지 (`IT전달패키지_v1.0/`)

회사 내부 VDI(인터넷 없는 내부망)에 올리기 위한 패키지입니다. 권장 방식은 Self-hosted Supabase입니다.

```
00_README_먼저읽기.md   IT팀이 결정할 7가지 포함
01_src/                 배포 소스. CDN 주소를 vendor/ 로컬 경로로 바꾼 것 + 별도 config.js(운영용 템플릿)
  vendor/               Bootstrap, Font Awesome, Chart.js, supabase-js 2.117.0 + SHA256SUMS.txt
02_db/                  01_schema.sql, 02_storage_bucket.sql, 03_initial_data.sql(247건 + 이력 440건)
03_deploy/              fetch-vendor.ps1, nginx.conf.sample, web.config(IIS)
04_docs/                명세서 docx, 배포가이드.md, 개발_인수인계_노트.md
```

- **루트 소스를 고친 뒤 패키지 다시 만들기**: 루트의 HTML 5개를 `01_src/`로 복사하면서 CDN 주소 5개를 `vendor/...`로 바꿉니다. `css/style.css`, `js/common.js`, `js/seed-data.js`는 그대로 복사하고, **`01_src/js/config.js`는 덮어쓰지 않습니다.** 그다음 zip을 다시 만듭니다.
- `개발_인수인계_노트.md`에 소스 행 번호가 적혀 있습니다. 소스를 고치면 행 번호도 갱신하세요.
- 운영 전 보완 사항은 IT팀 몫으로 넘겼습니다: 인증, XSS 이스케이프, RLS(이상 필수), 첨부 다운로드, 한글 파일명, 단계 변경 원자성, 오류 무시.
- **전달 이력**: 네이버웍스 메일로 첨부해 보냈지만 관리자 첨부 제한(550 5.7.1)에 막혔습니다. OneDrive 공유 링크로 보내라고 안내했고, 실제 전달 여부는 확인하지 못했습니다.

## 남은 일 / 사용자에게 확인할 것

**보안 (2026-10-01 교체분 마무리 — 이게 최우선)**

0. **유출된 비밀번호 폐기**: 기존 비밀번호(`1234` 3명, 양동민님 개인 비밀번호 1건)는 이미 공개됐습니다.
   같은 비밀번호를 메일·은행·회사 계정에 쓰고 있었다면 **그쪽을 먼저** 바꿔야 합니다.
1. **`js/config.js`의 `LOGIN_EMAIL_DOMAIN` 설정**: 회사 메일 도메인을 아직 받지 못했습니다.
   빈 문자열이면 로그인 화면에서 메일 주소를 전부 입력해야 합니다.
2. **Supabase Authentication > Users에서 팀원 4명 계정 생성** (Auto Confirm User 켜기).
3. **`보안설정_SQL.sql` 실행** — 계정 생성 **후에** 실행합니다(먼저 실행하면 아무도 못 봅니다).
4. **Authentication > Providers > Email에서 'Enable email signup' 끄기** — 외부인 자가 가입 차단.
5. **GitHub 저장소 비공개 전환** 및 로그인 실제 동작 테스트.
6. IT 전달 패키지(`IT전달패키지_v1.0/`) 재생성: 이번 인증 변경이 아직 반영되지 않았습니다.
   `01_src/`의 HTML·JS와 `02_db/`의 RLS 부분을 함께 갱신해야 합니다.

**기능**

1. 247건 담당자 지정: 한 건씩 편집하거나, 규칙(예: 자산군별 담당자)을 받아 일괄 지정합니다.
2. 네 명 중 팀장이 누구인지 확인하고 명세서 2.1 표에 반영합니다. (`CURRENT_USER`는 삭제됐으므로 코드 반영은 불필요)
3. 단계 이름을 회사 용어(제안접수, 초기검토, 상세검토, 투심위상정, 투자집행)로 바꿀지 결정합니다.
4. 이후 분기(2026.3Q 등) 엑셀 추가 이관.
5. IT팀 회신에 따른 후속 작업 (백엔드 방식, 서버, 인증 등).

## 환경 주의사항

- `tools/windows/`의 스크립트는 **Windows 전용**입니다. Word·Excel COM 자동화와 PowerShell 5.1을 씁니다.
  - `gen_frd.ps1`: 명세서 docx 생성
  - `import_excel.ps1`: 엑셀 → seed/SQL 변환
  - `serve.ps1`: 확인용 로컬 웹서버
  - 맥에서는 Python(python-docx, openpyxl)이나 Node(docx)로 새로 작성하세요. 맥에는 기본 Python이 없을 수 있습니다(Command Line Tools 설치 필요).
- PowerShell 5.1에서 겪은 함정:
  - 한글이 든 .ps1은 **UTF-8 BOM**으로 저장해야 합니다.
  - 함수 이름이 기본 별칭(`sc` = Set-Content, `rp` = Remove-ItemProperty)과 겹치면 함수가 무시됩니다.
  - 문자열 안의 `"$var건"`은 한글까지 변수명으로 읽히므로 `"${var}건"`으로 씁니다.
- 화면 확인: 맥에서는 `index.html`을 Chrome으로 열면 됩니다(CDN 사용). 로컬 서버가 필요하면 `python3 -m http.server`를 씁니다.
- 브라우저 localStorage에 있는 데이터는 **파일이 아니어서 PC를 옮기면 따라오지 않습니다.** 맥에서는 seed-data.js의 247건으로 새로 시작합니다.
- 회사 PC 폴더 안에 있던 중첩 폴더 `딜접수,관리시스템/딜접수,관리시스템/`은 오래된 중복 사본이라 옮기지 않았습니다.
