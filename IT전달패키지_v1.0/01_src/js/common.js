// ================================================================
// 공통 모듈 - 모든 페이지에서 공유
// ================================================================

// 상수 정의
const STAGES = ['접수', '1차검토', '심층검토', 'IC', '투자확정', '패스'];
// 자산군 = 포트폴리오현황보고 '세부유형' 분류 (대체투자 → 주식 → 채권 순)
const ASSET_CLASSES = ['PE/VC', '부동산', '인프라', '사모크레딧',
                       '상장주식', '메자닌/비상장', '공모주',
                       '원화채권', '해외채권', '기타'];
const INTAKE_CHANNELS = ['이메일', '카카오톡', '텔레그램', '기타'];
const FINAL_RESULTS = ['투자', '패스', '보류'];
const UNASSIGNED = '미배정';   // 담당자 미지정 딜 (엑셀 이관분 등)

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
let _sb = null;
function getSB() {
  if (!_sb && !DEMO_MODE) {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
    const newDeal = { ...data, id: demoId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    deals.unshift(newDeal);
    demoSet('deals_v3', deals);
    await addStageHistory(newDeal.id, newDeal.current_stage || '접수', CURRENT_USER);
    return newDeal;
  }
  const { data: created, error } = await getSB().from('deals').insert(data).select().single();
  if (error) throw error;
  await addStageHistory(created.id, created.current_stage, CURRENT_USER);
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
  await addStageHistory(dealId, newStage, CURRENT_USER);
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

async function addStageHistory(dealId, stage, changedBy) {
  if (DEMO_MODE) {
    const hist = demoGet('stage_history_v3');
    hist.push({ id: demoId(), deal_id: dealId, stage, changed_by: changedBy, changed_at: new Date().toISOString() });
    demoSet('stage_history_v3', hist);
    return;
  }
  await getSB().from('deal_stage_history').insert({ deal_id: dealId, stage, changed_by: changedBy });
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
      file_size: file.size, uploaded_by: CURRENT_USER,
      uploaded_at: new Date().toISOString(), file_path: null
    };
    files.push(entry);
    demoSet('files_v3', files);
    return entry;
  }
  const path = `${dealId}/${Date.now()}_${file.name}`;
  const { error: uploadErr } = await getSB().storage.from('deal-files').upload(path, file);
  if (uploadErr) throw uploadErr;
  const { data, error } = await getSB().from('deal_files').insert({
    deal_id: dealId, file_name: file.name, file_path: path,
    file_size: file.size, uploaded_by: CURRENT_USER
  }).select().single();
  if (error) throw error;
  return data;
}

async function deleteFile(fileId, filePath) {
  if (DEMO_MODE) {
    demoSet('files_v3', demoGet('files_v3').filter(f => f.id !== fileId));
    return;
  }
  if (filePath) await getSB().storage.from('deal-files').remove([filePath]);
  await getSB().from('deal_files').delete().eq('id', fileId);
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
    { id:'new',       label:'새 딜 입력', icon:'fa-plus-circle',    href:'deal-new.html' },
  ];

  const modeLabel = DEMO_MODE
    ? '<span class="badge bg-warning text-dark">데모모드</span>'
    : '<span class="badge bg-success">라이브</span>';

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
      <span>${CURRENT_USER}</span>
    </div>`;
}

// 초기화
if (DEMO_MODE) initDemoData();
