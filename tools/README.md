# tools/ — 보조 스크립트

소스를 고친 뒤 돌려보는 검사·생성 스크립트입니다.
`tools/windows/` 안의 것들은 **Windows 전용**(PowerShell + Office COM)이고,
여기 바로 아래 있는 것들은 **맥·리눅스·윈도 공통**입니다.

| 스크립트 | 하는 일 | 필요한 것 |
|---|---|---|
| `check_xss.py` | 사용자 입력이 escape 없이 화면에 들어가는 곳을 전수 검사 | Python 3 |
| `make_package.py` | IT 전달 패키지(`IT전달패키지_v1.0/01_src`) 재생성 + CDN 주소 치환 확인 | Python 3 |
| `test_security.js` | 실제 브라우저로 XSS·로그인 차단 32개 항목 검사 | Node.js + Playwright |
| `mac/upload_to_supabase.py` | `seed-data.js`의 딜 247건·단계이력을 Supabase로 일괄 업로드 | Python 3 + service_role 키 |
| `mac/finish_security.sh` | **보안 마무리 한 번에**: 받은 코드 확인 → DB 잠금 판정 → 위험 파일 정리 → 남은 할 일 안내 | bash + curl (맥 기본) |

## 보안 마무리 (가장 먼저 쓸 것)

```bash
bash tools/mac/finish_security.sh
```

로그인하지 않은 상태로 DB에 접근해 보고 **`잠김` / `열려있음` / `애매함`** 을 판정합니다.
설정 쿼리를 읽는 대신 실제 접근 결과를 보므로, 정책이 어떻게 꼬여 있든 결론이 나옵니다.

- `열려있음` → `보안설정_SQL.sql` 을 아직 실행하지 않았거나 `anon` 정책이 남아 있습니다
- `잠김` → 정상. 비로그인 접근이 차단됩니다
- `애매함` → 접근은 되지만 0건. 로그인해서 247건이 보이면 정상, 안 보이면 업로드가 안 된 것입니다

위험한 임시 SQL 파일은 자동으로 지우고, `service_role` 키는 물어본 뒤 지웁니다
(이 폴더 + 옆에 있는 백업·사본 폴더까지 찾습니다). 몇 번이든 다시 실행해도 안전합니다.
데이터는 읽기만 하고 건수도 받지 않습니다.

## 언제 돌리나

**화면 코드(`*.html`, `js/common.js`)를 고쳤다면:**

```bash
python3 tools/check_xss.py        # escape 누락 0건이어야 합니다
node    tools/test_security.js    # 32개 항목 전부 통과해야 합니다
python3 tools/make_package.py     # 전달 패키지에 반영
```

`make_package.py`는 **마지막에** 돌리세요. 소스를 고친 뒤 패키지를 먼저 만들면
수정 전 코드가 패키지에 들어갑니다.

## Playwright 설치 (test_security.js 용)

```bash
npm i -D playwright
npx playwright install chromium
```

설치가 어려우면 `check_xss.py`만으로도 escape 누락은 잡을 수 있습니다.
다만 이벤트 위임(삭제 버튼) 동작과 로그인 차단은 브라우저 테스트에서만 확인됩니다.

## 데이터 업로드 — 두 가지 방법

| | `admin.html` 의 '데이터 업로드' 버튼 | `mac/upload_to_supabase.py` |
|---|---|---|
| 권한 | 로그인한 사용자 (anon 키 + 세션) | **service_role 키 (DB 전체 권한)** |
| 쓰는 곳 | 브라우저 | 터미널 |
| RLS | 적용받음 | 무시하고 통과 |
| 추천 | **이쪽을 먼저 쓰세요** | 브라우저로 안 될 때만 |

`upload_to_supabase.py`는 `.service_role_key` 파일에서 키를 읽습니다.
이 키는 **RLS를 무시하고 모든 잠금을 통과**하므로, anon 키와 달리 진짜 비밀입니다.

- `.gitignore`에 들어 있어 저장소에는 올라가지 않습니다.
- 다만 **폴더를 복사하면 키도 같이 복사됩니다.** git만 막아줄 뿐입니다.
- **업로드가 끝났으면 키 파일을 지우세요.** 남겨둘 이유가 없습니다.
  ```bash
  rm .service_role_key
  ```
- 키가 외부에 노출됐을 가능성이 있으면, Supabase에서 JWT 시크릿을 재발급해야
  합니다. 이때 anon 키도 함께 바뀌므로 `js/config.js`도 같이 수정해야 합니다.

## 실행하면 안 되는 SQL

`02_RLS정책_SQL에디터에_붙여넣기.sql` 이라는 파일이 보이면 **실행하지 말고 지우세요.**
로그인 기능이 없던 시절의 임시 파일로, `TO anon` 정책을 만들어
**로그인하지 않은 사람에게 DB 전체를 개방합니다.**

PostgreSQL은 허용 정책을 OR로 합치기 때문에, 이 정책이 하나라도 남아 있으면
`보안설정_SQL.sql`로 잠가도 느슨한 쪽이 이깁니다.
(`보안설정_SQL.sql`은 이제 기존 정책을 **이름에 상관없이 전부** 지운 뒤
새로 만들므로, 먼저 실행된 적이 있어도 정리됩니다.)

## 주의

`test_security.js`는 임시 폴더에 소스를 복사해 로컬 서버로 띄워 검사합니다.
**실제 Supabase 에는 접속하지 않으며**, 실제 데이터도 건드리지 않습니다.
