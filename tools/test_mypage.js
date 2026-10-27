#!/usr/bin/env node
// 실제 계정·비밀번호를 바꾸지 않고 Auth 응답을 대체해 마이페이지를 검사합니다.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.dirname(__dirname);
const VENDOR = path.join(ROOT, 'IT전달패키지_v1.0/01_src/vendor');
const mockAuth = `
window.testAuth = { user: JSON.parse(localStorage.getItem('test-auth-user') || 'null') || { id:'test-user', email:'dongmin.yang@example.test', user_metadata:{} }, updates:[], failure:false, badCurrent:false };
window.supabase = {createClient:()=>({auth:{
 getSession:async()=>({data:{session:{user:structuredClone(testAuth.user)}}}),
 getUser:async()=>({data:{user:structuredClone(testAuth.user)},error:null}),
 signOut:async()=>({error:null}),
 signInWithPassword:async()=>testAuth.badCurrent ? {error:{code:'invalid_credentials',message:'Invalid login credentials'}} : {data:{user:structuredClone(testAuth.user)},error:null},
 updateUser:async payload=>{
  testAuth.updates.push(payload);
  if(testAuth.failure)return {error:{message:'test failure'}};
  if(payload.data)Object.assign(testAuth.user.user_metadata,payload.data);localStorage.setItem('test-auth-user',JSON.stringify(testAuth.user));
  return {data:{user:structuredClone(testAuth.user)},error:null};
 }
}})};`;
(async () => {
  const options = { headless:true };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) options.executablePath = chrome;
  const browser = await chromium.launch(options);
  let checks = 0;
  const check = (value, label) => { assert(value, label); checks++; console.log('PASS ' + label); };
  async function context(loggedIn) {
    const ctx = await browser.newContext({ viewport:{width:1280,height:900} });
    if(loggedIn)await ctx.addInitScript(()=>localStorage.setItem('sb-test-auth-token','test-session'));
    await ctx.route('**/*',route=>{
      const u = new URL(route.request().url());
      let file, body, type;
      if(u.hostname==='mypage.test') {
        file=path.join(ROOT,u.pathname.slice(1));
        type=file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'image/png';
      } else if(u.pathname.includes('supabase-js')) { body=mockAuth; type='text/javascript'; }
      else if(u.pathname.includes('bootstrap.min.css')) {file=path.join(VENDOR,'bootstrap/bootstrap.min.css');type='text/css';}
      else if(u.pathname.includes('bootstrap.bundle.min.js')) {file=path.join(VENDOR,'bootstrap/bootstrap.bundle.min.js');type='text/javascript';}
      else {body='';type=u.pathname.endsWith('.css')?'text/css':'text/javascript';}
      if(file)body=fs.readFileSync(file);
      return route.fulfill({status:200,contentType:type,body});
    });
    return ctx;
  }
  try {
    const ctx=await context(true), page=await ctx.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('https://mypage.test/mypage.html');
    await page.waitForFunction(()=>!document.querySelector('#profileFields').disabled);
    check(await page.locator('#profileName').inputValue()==='양동민','기존 아이디를 한글 이름으로 초기 표시');
    check(await page.locator('.sidebar-profile').getAttribute('href')==='mypage.html','왼쪽 하단 마이페이지 링크');
    check(await page.locator('#profileEmail').getAttribute('readonly')!==null,'이메일 변경 불가');
    await page.locator('#profileName').fill('양동민 <img src=x onerror=alert(1)>');
    await page.locator('#profileDepartment').fill('자산운용팀');await page.locator('#profileJobTitle').fill('팀장');
    await page.locator('#profileSave').click();
    await page.waitForFunction(()=>document.querySelector('#profileStatus').textContent.includes('저장했습니다'));
    check((await page.locator('.sidebar-profile').innerText()).includes('<img src=x'),'저장한 이름을 안전한 텍스트로 표시');
    check(await page.locator('.sidebar-profile img').count()===0,'프로필 HTML 삽입 방지');
    await page.reload();await page.waitForFunction(()=>!document.querySelector('#profileFields').disabled);
    check(await page.locator('#profileName').inputValue()==='양동민 <img src=x onerror=alert(1)>','새로고침 후 저장된 프로필 조회');
    check(await page.locator('#profileDepartment').inputValue()==='자산운용팀','부서 저장');
    check(await page.evaluate(()=>currentUserName())==='dongmin.yang','로그인·담당자 아이디 유지');
    await page.evaluate(()=>testAuth.failure=true);await page.locator('#profileSave').click();
    await page.waitForFunction(()=>document.querySelector('#profileStatus').textContent.includes('실패'));
    check(await page.locator('#profileFields').isEnabled(),'프로필 오류 후 재시도 가능');
    await page.evaluate(()=>{testAuth.failure=false;testAuth.updates=[];});
    async function passwords(a,b,c){await page.locator('#currentPassword').fill(a);await page.locator('#newPassword').fill(b);await page.locator('#confirmPassword').fill(c);await page.locator('#passwordSave').click();}
    await passwords('old-test-password','new-test-password','different-password');
    check(await page.evaluate(()=>testAuth.updates.length)===0,'확인 비밀번호 불일치 시 저장 차단');
    await page.evaluate(()=>testAuth.badCurrent=true);
    await passwords('incorrect-password','new-test-password','new-test-password');
    await page.waitForFunction(()=>document.querySelector('#passwordStatus').textContent.includes('현재 비밀번호가 맞지'));
    check(await page.evaluate(()=>testAuth.updates.length)===0,'현재 비밀번호 오류 시 변경 차단');
    await page.evaluate(()=>testAuth.badCurrent=false);
    await passwords('old-test-password','new-test-password','new-test-password');
    await page.waitForFunction(()=>document.querySelector('#passwordStatus').textContent.includes('변경했습니다'));
    check(await page.evaluate(()=>testAuth.updates.length===1&&Object.keys(testAuth.updates[0]).join()==='password'),'본인 비밀번호만 Auth로 변경');
    check(await page.locator('#currentPassword').inputValue()===''&&await page.locator('#newPassword').inputValue()==='','변경 후 비밀번호 입력값 지움');
    await page.evaluate(()=>testAuth.failure=true);
    await passwords('old-test-password','new-test-password2','new-test-password2');
    await page.waitForFunction(()=>document.querySelector('#passwordStatus').textContent.includes('실패'));
    check(await page.locator('#passwordFields').isEnabled(),'비밀번호 변경 실패 후 재시도 가능');
    await page.evaluate(()=>testAuth.failure=false);
    await page.locator('#profileName').fill('양동민');await page.locator('#profileSave').click();
    await page.waitForFunction(()=>document.querySelector('#profileStatus').textContent.includes('저장했습니다'));
    await page.screenshot({path:path.join(require('os').tmpdir(),'deal-mypage-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(require('os').tmpdir(),'deal-mypage-mobile.png'),fullPage:true});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'모바일 가로 넘침 없음');
    check(errors.length===0,'브라우저 실행 오류 없음');
    await ctx.close();
    const guest=await context(false), guestPage=await guest.newPage();
    await guestPage.goto('https://mypage.test/mypage.html');await guestPage.waitForURL('**/login.html');
    check(guestPage.url().endsWith('/login.html'),'비로그인 접근 차단');await guest.close();
    console.log('마이페이지 검증 '+checks+'개 통과');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
