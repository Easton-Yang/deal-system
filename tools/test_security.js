#!/usr/bin/env node
/**
 * 보안 회귀 테스트 (실제 브라우저)
 *
 * 쓰는 법 (프로젝트 폴더에서):
 *     node tools/test_security.js
 *
 * 필요한 것
 *     Node.js + Playwright.  없으면:  npm i -D playwright && npx playwright install chromium
 *
 * 무엇을 검사하는가
 *     1) XSS      : 딜명·메모·파일명에 악성 문자열을 넣고, 브라우저에서
 *                   코드로 실행되지 않는지 확인합니다.
 *     2) 로그인   : 로그인하지 않은 상태로 각 화면에 직접 접속할 때 차단되는지,
 *                   예전 방식의 위조된 값이나 가짜 토큰으로 통과되지 않는지 확인합니다.
 *
 * 어떻게 돌아가는가
 *     루트 소스를 임시 폴더로 복사하고, 전달 패키지의 vendor/ (라이브러리 로컬 사본)를
 *     함께 넣어 인터넷 없이 돌립니다. 설정만 바꿔 두 번(데모 모드 / 운영 모드) 띄웁니다.
 *     실제 Supabase 에는 접속하지 않습니다.
 */
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.dirname(__dirname);
const VENDOR = path.join(ROOT, 'IT전달패키지_v1.0', '01_src', 'vendor');
const HTML = ['login.html', 'admin.html', 'index.html', 'deals.html',
              'deal-new.html', 'deal-detail.html', 'portfolio.html'];

let pass = 0, fail = 0;
const check = (n, c, extra) => {
  if (c) { pass++; console.log('  OK   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (extra ? '\n         → ' + extra : '')); }
};
const pageOf = u => { try { return new URL(u).pathname.split('/').pop(); } catch (e) { return u; } };

function buildSite(demoMode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dealsec-'));
  for (const f of HTML) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.cpSync(path.join(ROOT, 'css'), path.join(dir, 'css'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'js'), path.join(dir, 'js'), { recursive: true });
  if (fs.existsSync(VENDOR)) {
    fs.cpSync(VENDOR, path.join(dir, 'vendor'), { recursive: true });
    // CDN 주소를 로컬 vendor 로 바꿔 인터넷 없이 돌립니다.
    const map = {
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2': 'vendor/supabase/supabase.js',
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css': 'vendor/bootstrap/bootstrap.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css': 'vendor/bootstrap/bootstrap.min.css',
      'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js': 'vendor/bootstrap/bootstrap.bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js': 'vendor/bootstrap/bootstrap.bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js': 'vendor/chartjs/chart.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css': 'vendor/fontawesome/css/all.min.css',
    };
    for (const f of HTML) {
      const p = path.join(dir, f);
      let t = fs.readFileSync(p, 'utf8');
      for (const url of Object.keys(map).sort((a, b) => b.length - a.length)) t = t.split(url).join(map[url]);
      fs.writeFileSync(p, t);
    }
  }
  // 설정 치환
  const cp = path.join(dir, 'js', 'config.js');
  let cfg = fs.readFileSync(cp, 'utf8');
  cfg = cfg.replace(/const DEMO_MODE = (true|false);/, 'const DEMO_MODE = ' + demoMode + ';');
  if (!demoMode) {
    // 운영 모드지만 Supabase 에는 일부러 닿지 않게 둡니다.
    cfg = cfg.replace(/const SUPABASE_URL\s*=\s*'[^']*';/,
                      "const SUPABASE_URL  = 'http://127.0.0.1:9/unreachable';");
  }
  fs.writeFileSync(cp, cfg);
  return dir;
}

function serve(dir, port) {
  const py = spawnSync('sh', ['-c', 'command -v python3 || command -v python'], { encoding: 'utf8' });
  const bin = (py.stdout || '').trim().split('\n')[0];
  if (!bin) throw new Error('python3 을 찾을 수 없습니다. 테스트용 로컬 서버를 띄울 수 없습니다.');
  const srv = spawn(bin, ['-m', 'http.server', String(port)], { cwd: dir, stdio: 'ignore' });
  return srv;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAYLOAD_IMG = `<img src=x onerror="window.__XSS_IMG=1">`;
const PAYLOAD_QUOT = `오름PE'" onclick="window.__XSS_ATTR=1" x="`;

async function suiteXSS(browser, base) {
  console.log('\n[1] XSS: 악성 문자열이 코드로 실행되지 않는가 (데모 모드)');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', async d => await d.dismiss());

  await page.goto(base + '/deals.html');
  await page.evaluate(({ a, b }) => {
    const mk = (id, name) => ({
      id, deal_name: name, asset_class: 'PE/VC', intake_channel: '이메일',
      intake_date: '2026-09-01', assigned_to: 'tester', deal_size: 1000000000,
      current_stage: '접수', final_result: null, introducer_gp: name,
      first_opinion: name, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z'
    });
    localStorage.setItem('deals_v3', JSON.stringify([mk('d-img', a), mk('d-quot', b)]));
    localStorage.setItem('notes_v3', JSON.stringify([{ id: 'n1', deal_id: 'd-img', note_text: a, author: a, created_at: '2026-09-01T00:00:00Z' }]));
    localStorage.setItem('files_v3', JSON.stringify([{ id: 'f1', deal_id: 'd-img', file_name: a, file_size: 1024, uploaded_by: a, uploaded_at: '2026-09-01T00:00:00Z', file_path: null }]));
    localStorage.setItem('stage_history_v3', JSON.stringify([{ id: 'h1', deal_id: 'd-img', stage: '접수', changed_by: a, changed_at: '2026-09-01T00:00:00Z' }]));
  }, { a: PAYLOAD_IMG, b: PAYLOAD_QUOT });

  await page.reload();
  await page.waitForSelector('#dealsBody tr', { timeout: 15000 });

  const noImg = () => page.evaluate(() => document.querySelectorAll('img[src="x"]').length === 0);
  const noFire = () => page.evaluate(() => typeof window.__XSS_IMG === 'undefined');

  check('목록: 주입된 <img> 가 DOM 에 생기지 않음', await noImg());
  check('목록: onerror 핸들러 미실행', await noFire());
  check('목록: 속성 탈출(onclick 주입) 없음',
        await page.evaluate(() => typeof window.__XSS_ATTR === 'undefined'));
  check('목록: 딜명이 글자 그대로 표시됨',
        await page.evaluate(() => document.querySelector('#dealsBody tr td div').textContent) === PAYLOAD_IMG);

  // 삭제 버튼: data-* + 캡처 단계 위임이 동작하는가
  const before = page.url();
  await page.click('#dealsBody tr:first-child .js-delete-deal');
  await sleep(600);
  check('삭제 버튼: 상세화면으로 이동하지 않음', page.url() === before, '이동: ' + pageOf(page.url()));
  check('삭제 버튼: 삭제 모달이 열림',
        await page.evaluate(() => document.getElementById('deleteModal').classList.contains('show')));
  check('삭제 버튼: 모달에 딜명이 글자 그대로 전달됨',
        await page.evaluate(() => document.getElementById('deleteDealName').textContent) === PAYLOAD_IMG);

  await page.goto(base + '/deals.html?view=kanban');
  await page.waitForSelector('.kanban-card', { timeout: 15000 });
  check('칸반: <img> 주입 없음', await noImg());
  check('칸반: onerror 미실행', await noFire());

  await page.goto(base + '/deal-detail.html?id=d-img');
  await sleep(1500);
  check('상세(메모·첨부·이력): <img> 주입 없음', await noImg());
  check('상세: onerror 미실행', await noFire());
  check('상세: 첨부 파일명이 글자 그대로 표시됨',
        await page.evaluate(() => { const e = document.querySelector('.file-name'); return e ? e.textContent : null; }) === PAYLOAD_IMG);

  for (const [label, url] of [['대시보드', '/index.html'], ['진행경과', '/portfolio.html']]) {
    await page.goto(base + url);
    await sleep(1500);
    check(label + ': <img> 주입 없음', await noImg());
    check(label + ': onerror 미실행', await noFire());
  }

  check('자바스크립트 오류 없음', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

async function suiteGuard(browser, base) {
  console.log('\n[2] 로그인: 미로그인 접근이 차단되는가 (운영 모드, Supabase 도달 불가)');

  for (const p of ['index.html', 'deals.html', 'deal-new.html', 'deal-detail.html', 'portfolio.html', 'admin.html']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('dialog', async d => await d.dismiss());
    await page.goto(base + '/' + p).catch(() => {});
    await sleep(900);
    check(p + ' → 로그인 화면으로 보냄', pageOf(page.url()) === 'login.html', '머문 주소: ' + pageOf(page.url()));
    await ctx.close();
  }

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('dialog', async d => await d.dismiss());
    await page.goto(base + '/login.html').catch(() => {});
    // 예전 코드는 이 값만 있으면 로그인된 것으로 취급했습니다.
    await page.evaluate(() => localStorage.setItem('current_user',
      JSON.stringify({ id: 'x', username: 'someone', full_name: '누군가', role: 'admin' })));
    await page.goto(base + '/index.html').catch(() => {});
    await sleep(900);
    check('위조된 current_user 로도 진입 불가', pageOf(page.url()) === 'login.html', '머문 주소: ' + pageOf(page.url()));

    // 이름 규칙만 흉내낸 가짜 토큰 (서버 서명이 없으므로 무효)
    await page.evaluate(() => localStorage.setItem('sb-fake-auth-token', JSON.stringify({ access_token: 'fake' })));
    await page.goto(base + '/index.html').catch(() => {});
    await sleep(2500);
    check('가짜 Auth 토큰으로도 진입 불가', pageOf(page.url()) === 'login.html', '머문 주소: ' + pageOf(page.url()));
    await ctx.close();
  }

  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('dialog', async d => await d.dismiss());
    await page.goto(base + '/login.html').catch(() => {});
    await sleep(900);
    check('login.html 은 튕기지 않음', pageOf(page.url()) === 'login.html');
    check('아이디 입력칸 있음', await page.evaluate(() => !!document.getElementById('loginId')));
    check('비밀번호 입력칸 있음', await page.evaluate(() => !!document.getElementById('loginPassword')));
    check('평문 비밀번호를 다루는 관리 탭이 없음', await page.evaluate(() => !document.getElementById('admin-tab')));

    await page.fill('#loginId', 'nobody@example.com');
    await page.fill('#loginPassword', 'wrong-password');
    await page.click('#loginBtn');
    await sleep(2500);
    check('틀린 정보 입력 시 오류 안내 표시',
          await page.evaluate(() => { const e = document.getElementById('login-error'); return !!(e && !e.classList.contains('d-none') && e.textContent); }));
    check('로그인되지 않고 화면에 머묾', pageOf(page.url()) === 'login.html');
    check('비밀번호 칸이 비워짐', await page.evaluate(() => document.getElementById('loginPassword').value) === '');
    await ctx.close();
  }
}

(async () => {
  const dirDemo = buildSite(true);
  const dirLive = buildSite(false);
  const srvDemo = serve(dirDemo, 8841);
  const srvLive = serve(dirLive, 8842);
  await sleep(1800);

  const launch = {};
  // Playwright 가 찾지 못하는 환경(사전 설치된 브라우저)을 위한 경로
  for (const p of ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome']) {
    if (fs.existsSync(p)) { launch.executablePath = p; break; }
  }
  const browser = await chromium.launch(launch);

  try {
    await suiteXSS(browser, 'http://127.0.0.1:8841');
    await suiteGuard(browser, 'http://127.0.0.1:8842');
  } finally {
    await browser.close();
    srvDemo.kill(); srvLive.kill();
    fs.rmSync(dirDemo, { recursive: true, force: true });
    fs.rmSync(dirLive, { recursive: true, force: true });
  }

  console.log('\n────────────────────────────');
  console.log('통과 ' + pass + ' / 실패 ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('테스트 실행 오류:', e.message); process.exit(1); });
