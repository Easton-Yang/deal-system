# tools/ — 보조 스크립트

소스를 고친 뒤 돌려보는 검사·생성 스크립트입니다.
`tools/windows/` 안의 것들은 **Windows 전용**(PowerShell + Office COM)이고,
여기 바로 아래 있는 것들은 **맥·리눅스·윈도 공통**입니다.

| 스크립트 | 하는 일 | 필요한 것 |
|---|---|---|
| `check_xss.py` | 사용자 입력이 escape 없이 화면에 들어가는 곳을 전수 검사 | Python 3 |
| `make_package.py` | IT 전달 패키지(`IT전달패키지_v1.0/01_src`) 재생성 + CDN 주소 치환 확인 | Python 3 |
| `test_security.js` | 실제 브라우저로 XSS·로그인 차단 32개 항목 검사 | Node.js + Playwright |

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

## 주의

`test_security.js`는 임시 폴더에 소스를 복사해 로컬 서버로 띄워 검사합니다.
**실제 Supabase 에는 접속하지 않으며**, 실제 데이터도 건드리지 않습니다.
