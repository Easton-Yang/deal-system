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
const APP_VERSION = 'Beta-7.1';

// 상수 정의
const STAGES = ['접수', '1차검토', '심층검토', 'IC', '투자확정', '패스'];
// 자산군 = 포트폴리오현황보고 '세부유형' 분류 (대체투자 → 주식 → 채권 순)
const ASSET_CLASSES = ['PE/VC', '부동산', '인프라', '사모크레딧',
                       '상장주식', '메자닌/비상장', '공모주',
                       '원화채권', '해외채권', '기타'];
const INTAKE_CHANNELS = ['이메일', '카카오톡', '텔레그램', '기타'];
const FINAL_RESULTS = ['투자', '패스', '보류'];
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

// 딜을 '패스'로 바꿀 때 고르는 사유 분류. 자유 메모(pass_reason_note)와
// 재검토 조건(reconsider_condition)은 별도 자유 입력 칸입니다.
const PASS_REASONS = ['가격', '구조', '신용', '한도', '일정', '기타'];

const STAGE_BADGE = {
  '접수':    'bg-secondary',
  '1차검토': 'bg-primary',
  '심층검토':'bg-warning text-dark',
  'IC':      'bg-info text-dark',
  '투자확정':'bg-success',
  '패스':    'bg-danger'
};

const ASSET_COLOR = {
  'PE/VC':    '#1a237e', '부동산':       '#2e7d32', '인프라':  '#e65100',
  '사모크레딧':'#6a1b9a', '상장주식':     '#ad1457', '메자닌/비상장':'#f06292',
  '공모주':   '#8d6e63', '원화채권':     '#00695c', '해외채권':'#0097a7',
  '기타':     '#616161'
};

const RESULT_BADGE = {
  '투자': 'bg-success', '패스': 'bg-danger', '보류': 'bg-warning text-dark'
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
    <div class="text-muted">${nextActionDueHTML(d.next_action_due)}${d.next_action_owner ? ' · ' + escapeHtml(d.next_action_owner) : ''}</div>
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
  const label = user ? (user.full_name || user.username || user.email) : '로그인 필요';
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
