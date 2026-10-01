#!/bin/bash
# =============================================================================
#  보안 마무리 — 한 번에 확인하고 정리합니다
# =============================================================================
#  쓰는 법 (맥 터미널에서, 프로젝트 폴더 안에서):
#      bash tools/mac/finish_security.sh
#
#  하는 일
#    1. 새 코드를 제대로 받았는지 확인
#    2. 로그인 안 한 상태로 DB에 접근해 보고 '잠김 / 열려있음' 판정
#    3. 위험한 파일(임시 RLS SQL, service_role 키) 정리
#    4. 남은 할 일을 알려줍니다
#
#  몇 번이든 다시 실행해도 안전합니다. 데이터는 건드리지 않습니다
#  (읽기만 하고, 건수도 받지 않고 접근 가능 여부만 봅니다).
# =============================================================================

set -u

CFG="js/config.js"
OK="  \033[32m✓\033[0m"
NG="  \033[31m✗\033[0m"
WARN="  \033[33m!\033[0m"
BOLD="\033[1m"; OFF="\033[0m"

say()  { printf "%b\n" "$1"; }
head2() { printf "\n%b\n" "${BOLD}$1${OFF}"; printf '%s\n' "────────────────────────────────────────────────"; }

if [ ! -f "$CFG" ]; then
  say "$NG 여기는 프로젝트 폴더가 아닙니다. (js/config.js 가 없습니다)"
  say "    먼저 이동하세요:  cd /Users/dm/Documents/deal-system"
  exit 1
fi

# -----------------------------------------------------------------------------
head2 "1. 새 코드를 받았는지"
# -----------------------------------------------------------------------------
VER=$(grep -o "APP_VERSION = '[^']*'" js/common.js 2>/dev/null | sed "s/.*'\(.*\)'/\1/")
if [ -n "$VER" ]; then say "$OK 버전: $VER"; else say "$NG APP_VERSION 을 찾지 못했습니다 (git pull 이 안 된 것 같습니다)"; fi

for f in login.html admin.html 보안설정_SQL.sql tools/check_xss.py; do
  if [ -e "$f" ]; then say "$OK $f"; else say "$NG $f 없음 — git pull origin main 이 필요합니다"; fi
done

if grep -q "service_role" .gitignore 2>/dev/null; then
  say "$OK .gitignore 에 키 파일 제외 설정됨"
else
  say "$NG .gitignore 에 .service_role_key 제외가 없습니다"
fi

# -----------------------------------------------------------------------------
head2 "2. DB 잠금 확인 (로그인하지 않은 상태로 접근 시도)"
# -----------------------------------------------------------------------------
# config.js 의 const 값을 그대로 읽습니다.
# (supabase.co 뿐 아니라 사내 self-hosted 주소도 동작하도록)
# 따옴표 사이의 값만 꺼냅니다 (cut 사용).
# sed 로 하면 큰따옴표 안의 $# 같은 기호가 bash 에 먼저 치환돼 구문이 깨집니다.
URL=$(grep "^const SUPABASE_URL" "$CFG" | head -1 | cut -d"'" -f2)
URL=${URL%/}
KEY=$(grep "^const SUPABASE_ANON_KEY" "$CFG" | head -1 | cut -d"'" -f2)

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  say "$WARN config.js 에서 Supabase 주소/키를 읽지 못해 건너뜁니다."
else
  say "  대상: $URL"
  say "  (공개용 anon 키로 접근. 데이터 내용은 받지 않습니다)"
  echo

  OPEN_COUNT=0; BLOCKED=0; EMPTY=0
  for T in deals deal_stage_history deal_notes deal_files; do
    H=$(mktemp)
    CODE=$(curl -s -o /dev/null -D "$H" -w "%{http_code}" \
      -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
      -H "Prefer: count=exact" -H "Range: 0-0" \
      "$URL/rest/v1/$T?select=id" 2>/dev/null)
    CR=$(grep -i "^content-range:" "$H" | tr -d '\r' | awk '{print $2}')
    TOTAL=$(printf '%s' "${CR:-}" | sed 's/.*\///')
    rm -f "$H"

    case "$CODE" in
      401|403)
        say "$OK $(printf '%-20s' "$T") 차단됨 (HTTP $CODE · 권한 없음)"
        BLOCKED=$((BLOCKED+1)) ;;
      200)
        if [ "${TOTAL:-0}" = "0" ]; then
          say "$WARN $(printf '%-20s' "$T") 접근은 되지만 0건 (잠김이거나 데이터가 없음)"
          EMPTY=$((EMPTY+1))
        else
          say "$NG $(printf '%-20s' "$T") ${TOTAL}건이 그대로 보입니다 — 열려 있습니다"
          OPEN_COUNT=$((OPEN_COUNT+1))
        fi ;;
      000)
        say "$WARN $(printf '%-20s' "$T") 연결 실패 (인터넷 확인)" ;;
      *)
        say "$WARN $(printf '%-20s' "$T") HTTP $CODE" ;;
    esac
  done

  # 평문 비밀번호가 있던 users 테이블
  UCODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    "$URL/rest/v1/users?select=id&limit=1" 2>/dev/null)
  case "$UCODE" in
    404) say "$OK $(printf '%-20s' "users") 테이블이 삭제됨 (평문 비밀번호 제거 완료)" ;;
    401|403) say "$WARN $(printf '%-20s' "users") 접근은 차단됐지만 테이블이 남아 있을 수 있습니다" ;;
    200) say "$NG $(printf '%-20s' "users") 아직 읽힙니다 — 평문 비밀번호가 남아 있을 수 있습니다" ;;
    *) say "$WARN $(printf '%-20s' "users") HTTP $UCODE" ;;
  esac

  echo
  if [ "$OPEN_COUNT" -gt 0 ]; then
    say "  ${BOLD}판정: 열려 있습니다 ✗${OFF}"
    say "  → 보안설정_SQL.sql 을 Supabase SQL Editor 에서 실행하세요."
    say "    (supabase.com → 프로젝트 → SQL Editor → New query → 전체 붙여넣기 → Run)"
    SQL_NEEDED=1
  elif [ "$BLOCKED" -ge 4 ]; then
    say "  ${BOLD}판정: 잠김 ✓${OFF} 로그인하지 않은 접근이 모두 차단됩니다."
    SQL_NEEDED=0
  elif [ "$EMPTY" -ge 1 ]; then
    say "  ${BOLD}판정: 애매함 !${OFF} 접근은 되지만 0건입니다."
    say "  → 로그인해서 딜 247건이 보이면 '데이터는 있고 잠긴' 상태입니다."
    say "    0건으로 보이면 데이터 업로드가 안 된 것이니 admin.html 에서 업로드하세요."
    SQL_NEEDED=0
  else
    say "  ${BOLD}판정: 확인 불가 !${OFF} 위 결과를 Claude 에게 보여주세요."
    SQL_NEEDED=0
  fi
fi

# -----------------------------------------------------------------------------
head2 "3. 위험한 파일 정리"
# -----------------------------------------------------------------------------
# (가) 임시 RLS SQL — 실행하면 비로그인 전체 개방이 되는 파일
RISKY=$(ls 02_RLS*.sql 2>/dev/null | head -1)
if [ -n "${RISKY:-}" ]; then
  rm -f "$RISKY"
  say "$OK 삭제: $RISKY"
  say "    (실행하면 잠금이 풀리는 파일이라 지웠습니다. 더 필요 없습니다)"
else
  say "$OK 임시 RLS SQL 파일 없음"
fi

# (나) service_role 키 — RLS 를 무시하고 전부 통과하는 키
# 이 폴더와, 옆에 있는 사본/백업 폴더까지 함께 찾습니다.
# (.gitignore 는 git 만 막습니다. 폴더를 복사하면 키도 같이 복사됩니다.)
FOUND_KEYS=""
[ -f ".service_role_key" ] && FOUND_KEYS=".service_role_key"
HERE=$(pwd -P)
for D in ../*/; do
  [ -d "$D" ] || continue
  THERE=$(cd "$D" 2>/dev/null && pwd -P) || continue
  [ "$THERE" = "$HERE" ] && continue      # 현재 폴더는 위에서 이미 처리
  [ -f "${D}.service_role_key" ] && FOUND_KEYS="$FOUND_KEYS ${D}.service_role_key"
done

if [ -z "$FOUND_KEYS" ]; then
  say "$OK service_role 키 파일 없음 (이미 정리됨)"
else
  echo
  say "$WARN service_role 키 파일이 있습니다:"
  for P in $FOUND_KEYS; do say "      $P"; done
  say "    이 키는 위에서 걸어둔 잠금을 ${BOLD}전부 통과${OFF}합니다."
  say "    딜 데이터 업로드가 끝났으면 지우는 것이 맞습니다."
  say "    다시 필요해지면 Supabase → Settings → API 에서 또 복사할 수 있습니다."
  echo
  printf "    지금 지울까요? (y = 지움 / 그 외 = 그대로 둠): "
  read -r ANS
  if [ "${ANS:-n}" = "y" ] || [ "${ANS:-n}" = "Y" ]; then
    for P in $FOUND_KEYS; do rm -f "$P" && say "$OK 삭제: $P"; done
  else
    say "$WARN 그대로 두었습니다. 업로드가 끝나면 다시 실행해 지우세요."
  fi
fi

# -----------------------------------------------------------------------------
head2 "4. 남은 할 일 (사람만 할 수 있는 것)"
# -----------------------------------------------------------------------------
if [ "${SQL_NEEDED:-0}" = "1" ]; then
  say "  ${BOLD}[1] 보안설정_SQL.sql 실행${OFF} ← 가장 급함"
  say "      supabase.com → SQL Editor → New query → 붙여넣기 → Run"
  say "      끝나면 이 스크립트를 다시 실행해 '잠김'으로 바뀌는지 확인하세요."
  echo
fi
say "  [2] 외부인 자가 가입 차단"
say "      Supabase → Authentication → Providers → Email"
say "      → 'Enable email signup' 끄기"
echo
say "  [3] GitHub 저장소 비공개 전환"
say "      github.com/Easton-Yang/deal-system → Settings"
say "      → 맨 아래 Danger Zone → Change visibility → Make private"
echo
say "  [4] 로그인 테스트"
say "      login.html 을 크롬으로 열고 ⌘+Shift+R (캐시 비우기) 후 로그인"
echo
say "  [5] IT팀에 새 패키지 재전달 (내용이 바뀌었습니다)"
say "      딜접수목록관리_전달패키지_v1.0.zip"
echo
say "────────────────────────────────────────────────"
say "이 결과를 그대로 복사해서 Claude 에게 보여주시면 남은 것을 짚어드립니다."
