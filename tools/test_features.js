#!/usr/bin/env node
/**
 * 기능 테스트 (실제 브라우저)
 *   - 담당자 일괄 변경
 *   - 첨부파일 다운로드 버튼
 *   - 단계 변경 시 이력 기록
 *
 * 쓰는 법 (프로젝트 폴더에서):
 *     node tools/test_features.js
 *
 * 필요한 것: Node.js + Playwright
 *     npm i -D playwright && npx playwright install chromium
 *
 * 무엇을 지키는지 (쉽게 깨지는 부분들)
 *   - 체크박스를 눌렀을 때 상세화면으로 튀지 않아야 합니다.
 *     표의 행에는 상세화면 이동 onclick 이 걸려 있어서, 체크박스 칸의
 *     stopPropagation 이 빠지면 체크하려다 화면이 넘어가 버립니다.
 *   - 필터를 바꿔도 선택이 유지되어야 합니다 (자산군별로 골라 담기 위해).
 *     대신 '화면에 안 보이는 선택 건수'를 반드시 경고해야 합니다.
 *   - 선택한 딜만 바뀌어야 합니다. 다른 자산군은 손대면 안 됩니다.
 *   - 기존 삭제 버튼과 행 클릭 이동이 계속 동작해야 합니다.
 *
 * 데모 모드(브라우저 저장소)로만 돌리며, 실제 Supabase 에는 접속하지 않습니다.
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
const PORT = 8873;

let pass = 0, fail = 0;
const check = (n, c, extra) => {
  if (c) { pass++; console.log('  OK   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (extra ? '\n         → ' + extra : '')); }
};
const pageOf = u => { try { return new URL(u).pathname.split('/').pop(); } catch (e) { return u; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function buildSite() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dealbulk-'));
  for (const f of HTML) fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
  fs.cpSync(path.join(ROOT, 'css'), path.join(dir, 'css'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'js'), path.join(dir, 'js'), { recursive: true });
  if (fs.existsSync(VENDOR)) {
    fs.cpSync(VENDOR, path.join(dir, 'vendor'), { recursive: true });
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
      for (const u of Object.keys(map).sort((a, b) => b.length - a.length)) t = t.split(u).join(map[u]);
      fs.writeFileSync(p, t);
    }
  }
  const cp = path.join(dir, 'js', 'config.js');
  fs.writeFileSync(cp, fs.readFileSync(cp, 'utf8')
    .replace(/const DEMO_MODE = (true|false);/, 'const DEMO_MODE = true;'));
  return dir;
}

function serve(dir, port) {
  const py = spawnSync('sh', ['-c', 'command -v python3 || command -v python'], { encoding: 'utf8' });
  const bin = (py.stdout || '').trim().split('\n')[0];
  if (!bin) throw new Error('python3 을 찾을 수 없습니다. 테스트용 로컬 서버를 띄울 수 없습니다.');
  return spawn(bin, ['-m', 'http.server', String(port)], { cwd: dir, stdio: 'ignore' });
}

(async () => {
  const dir = buildSite();
  const srv = serve(dir, PORT);
  await sleep(1800);

  const launch = {};
  for (const p of ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome']) {
    if (fs.existsSync(p)) { launch.executablePath = p; break; }
  }
  const b = await chromium.launch(launch);
  const BASE = 'http://127.0.0.1:' + PORT;

  try {
    const page = await b.newPage();
    const errs = [];
    let lastDialog = '';
    page.on('pageerror', e => errs.push(e.message));
    page.on('dialog', async d => { lastDialog = d.message(); await d.accept(); });

    // 자산군이 섞인 딜 5건을 브라우저 저장소에 넣습니다.
    await page.goto(BASE + '/deals.html');
    await page.evaluate(() => {
      const mk = (i, name, asset) => ({
        id: 'd' + i, deal_name: name, asset_class: asset, intake_channel: '이메일',
        intake_date: '2026-09-0' + i, assigned_to: '미배정', deal_size: 1000000000,
        current_stage: '접수', final_result: null, introducer_gp: 'GP' + i,
        first_opinion: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z'
      });
      localStorage.setItem('deals_v3', JSON.stringify([
        mk(1, '알파 부동산 펀드', '부동산'), mk(2, '베타 인프라', '인프라'),
        mk(3, '감마 PE', 'PE/VC'), mk(4, '델타 부동산 II', '부동산'),
        mk(5, '엡실론 채권', '원화채권')
      ]));
      localStorage.setItem('notes_v3', '[]');
      localStorage.setItem('files_v3', '[]');
      localStorage.setItem('stage_history_v3', '[]');
    });
    await page.reload();
    await page.waitForSelector('#dealsBody tr', { timeout: 15000 });

    console.log('\n[1] 초기 상태');
    check('딜 5건 표시', await page.locator('#dealsBody tr').count() === 5);
    check('일괄 변경 바는 숨겨져 있음', await page.locator('#bulkBar').isHidden());
    check('담당자 드롭다운 = 팀원4 + 미배정',
          await page.locator('#bulkAssignee option').count() === 5);

    console.log('\n[2] 체크박스를 눌러도 상세화면으로 튀지 않는가 (가장 깨지기 쉬움)');
    const u1 = page.url();
    await page.locator('#dealsBody tr').nth(0).locator('.js-row-check').check();
    await sleep(400);
    check('주소가 그대로', page.url() === u1, '이동: ' + pageOf(page.url()));
    check('일괄 변경 바 표시', await page.locator('#bulkBar').isVisible());
    check('선택 1건', (await page.locator('#bulkCount').textContent()) === '1');

    console.log('\n[3] 추가 선택 · 전체 선택');
    await page.locator('#dealsBody tr').nth(2).locator('.js-row-check').check();
    await sleep(300);
    check('선택 2건', (await page.locator('#bulkCount').textContent()) === '2');
    await page.locator('#checkAll').check();
    await sleep(300);
    check('전체 선택 5건', (await page.locator('#bulkCount').textContent()) === '5');
    check('모든 행 체크',
          await page.evaluate(() => Array.from(document.querySelectorAll('.js-row-check')).every(x => x.checked)));

    console.log('\n[4] 필터 변경 시 선택 유지 + 숨은 건수 경고');
    await page.selectOption('#filterAsset', '부동산');
    await sleep(500);
    check('부동산 2건만 표시', await page.locator('#dealsBody tr').count() === 2);
    check('선택 5건 유지', (await page.locator('#bulkCount').textContent()) === '5');
    check('숨은 건 경고 표시', await page.locator('#bulkHidden').isVisible());
    check('경고에 3건 명시', (await page.locator('#bulkHidden').textContent()).includes('3건'),
          await page.locator('#bulkHidden').textContent());

    console.log('\n[5] 선택 해제');
    await page.click('#bulkClearBtn');
    await sleep(300);
    check('바 숨김', await page.locator('#bulkBar').isHidden());
    check('행 체크 해제',
          await page.evaluate(() => Array.from(document.querySelectorAll('.js-row-check')).every(x => !x.checked)));

    console.log('\n[6] 실제 변경 — 선택한 딜만 바뀌어야 함');
    await page.locator('#checkAll').check();     // 필터된 부동산 2건
    await sleep(300);
    check('부동산 2건 선택', (await page.locator('#bulkCount').textContent()) === '2');
    check('숨은 건 경고 없음', await page.locator('#bulkHidden').isHidden());

    const who = await page.evaluate(() => TEAM_MEMBERS[1]);
    await page.selectOption('#bulkAssignee', who);
    await page.click('#bulkApplyBtn');
    await sleep(1500);

    check('확인창에 2건 명시', lastDialog.includes('2건'), lastDialog);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('deals_v3')));
    const changed = new Set(saved.filter(d => d.assigned_to === who).map(d => d.deal_name));
    check('부동산 2건만 변경 (다른 자산군 불변)',
          changed.size === 2 && ['알파 부동산 펀드', '델타 부동산 II'].every(n => changed.has(n)),
          '실제 변경: ' + JSON.stringify(Array.from(changed)));
    check('나머지 3건 미배정 유지',
          saved.filter(d => d.assigned_to === '미배정').length === 3);
    check('변경 후 선택 해제', await page.locator('#bulkBar').isHidden());
    check('화면에 반영됨',
          (await page.locator('#dealsBody tr').nth(0).textContent()).includes(who));

    console.log('\n[7] 담당자 필터 옵션이 중복되지 않았는가');
    check('옵션 6개 (전체 + 팀원4 + 미배정)',
          await page.locator('#filterAssignee option').count() === 6,
          '실제: ' + await page.locator('#filterAssignee option').count());

    console.log('\n[8] 기존 기능 유지');
    await page.selectOption('#filterAsset', '');
    await sleep(400);
    const u2 = page.url();
    await page.locator('#dealsBody tr').nth(0).locator('.js-delete-deal').click();
    await sleep(600);
    check('삭제 버튼: 행 이동 안 함', page.url() === u2);
    check('삭제 버튼: 모달 열림',
          await page.evaluate(() => document.getElementById('deleteModal').classList.contains('show')));
    await page.keyboard.press('Escape');
    await sleep(500);
    await page.locator('#dealsBody tr').nth(0).locator('td').nth(1).click();
    await sleep(800);
    check('행 본문 클릭 → 상세화면 이동', pageOf(page.url()) === 'deal-detail.html',
          '머문 주소: ' + pageOf(page.url()));

    console.log('\n[9] 첨부파일 다운로드 버튼');
    await page.evaluate(() => {
      // 저장 경로가 있는 파일 1건 + 없는 파일 1건 (데모 모드는 경로가 null)
      localStorage.setItem('files_v3', JSON.stringify([
        { id: 'f1', deal_id: 'd2', file_name: '제안서 최종.pdf', file_size: 204800,
          uploaded_by: 'tester', uploaded_at: '2026-10-01T00:00:00Z',
          file_path: 'd2/1730000000_a1b2c3.pdf' },
        { id: 'f2', deal_id: 'd2', file_name: '경로없음.xlsx', file_size: 1024,
          uploaded_by: 'tester', uploaded_at: '2026-10-01T00:00:00Z', file_path: null }
      ]));
    });
    await page.goto(BASE + '/deal-detail.html?id=d2');
    await sleep(1500);

    check('첨부 2건 표시', await page.locator('.file-item').count() === 2);
    check('경로가 있는 파일 → 다운로드 버튼 활성',
          await page.locator('.js-download-file').count() === 1);
    check('경로가 없는 파일 → 다운로드 버튼 비활성',
          await page.locator('.file-item button[disabled]').count() === 1);
    check('파일명이 글자 그대로 표시됨',
          (await page.locator('.file-name').first().textContent()).trim() === '제안서 최종.pdf');

    // 데모 모드에서는 실제 파일이 없으므로 안내가 떠야 합니다 (조용히 실패하면 안 됨)
    await page.click('.js-download-file');
    await sleep(900);
    const toast = await page.evaluate(() => {
      const t = document.getElementById('_toast');
      return t ? t.textContent : null;
    });
    check('데모 모드 다운로드 → 이유를 알려주는 안내 표시',
          !!toast && toast.includes('데모 모드'), '토스트: ' + toast);
    check('다운로드 버튼이 다시 눌릴 수 있는 상태로 복구',
          await page.evaluate(() => !document.querySelector('.js-download-file').disabled));

    console.log('\n[10] 단계 변경 시 이력이 기록되는가');
    await page.evaluate(() => localStorage.setItem('stage_history_v3', '[]'));
    await page.goto(BASE + '/deal-detail.html?id=d2');
    await sleep(1500);
    await page.evaluate(() => changeStageUI('심층검토'));
    await sleep(1200);
    const hist = await page.evaluate(() => JSON.parse(localStorage.getItem('stage_history_v3')));
    check('이력 1건 기록됨', hist.length === 1, JSON.stringify(hist));
    check('기록된 단계가 심층검토', hist.length === 1 && hist[0].stage === '심층검토');
    const deals2 = await page.evaluate(() => JSON.parse(localStorage.getItem('deals_v3')));
    check('딜의 현재 단계도 바뀜',
          (deals2.find(d => d.id === 'd2') || {}).current_stage === '심층검토');

    console.log('\n[11] 칸반 뷰');
    await page.goto(BASE + '/deals.html?view=kanban');
    await page.waitForSelector('.kanban-card', { timeout: 15000 });
    check('칸반에서 바 숨김', await page.locator('#bulkBar').isHidden());

    console.log('\n[12] 자바스크립트 오류');
    check('오류 없음', errs.length === 0, errs.join(' | '));
  } finally {
    await b.close();
    srv.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }

  console.log('\n────────────────────────────');
  console.log('통과 ' + pass + ' / 실패 ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('테스트 실행 오류:', e.message); process.exit(1); });
