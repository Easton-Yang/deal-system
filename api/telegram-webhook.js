// ================================================================
// 텔레그램 딜 접수 봇 — 웹훅(Webhook) 서버 함수
// ================================================================
// 담당자가 텔레그램 봇에게 딜 내용을 메시지로 보내면, 텔레그램이 이
// 함수를 호출합니다. 여기서 AI(Anthropic Claude API)로 메시지를
// 분석해 딜 항목을 뽑아내고, Supabase 의 deal_drafts 테이블에
// '초안'으로 저장합니다. 실제 deals 테이블에는 담당자가
// deal-drafts.html 화면에서 확인한 뒤에만 들어갑니다.
//
// Vercel 서버리스 함수입니다. /api/telegram-webhook.js 에 두면
// https://<내 배포 주소>/api/telegram-webhook 으로 자동 연결됩니다.
// 브라우저 화면(HTML/JS)과 달리 이 코드는 서버에서만 실행되므로,
// 여기서 쓰는 비밀 키(ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
// TELEGRAM_BOT_TOKEN)는 브라우저로 내려가지 않습니다.
// → Vercel 대시보드 > Settings > Environment Variables 에서 설정하세요.
//
// 필요한 환경변수
//   TELEGRAM_BOT_TOKEN        @BotFather 에서 받은 봇 토큰
//   TELEGRAM_WEBHOOK_SECRET   임의의 긴 문자열. 텔레그램이 보낸 요청이
//                             맞는지 확인하는 용도 (setWebhook 등록 시
//                             secret_token 으로 같은 값을 넣어야 함)
//   ANTHROPIC_API_KEY         console.anthropic.com 에서 발급
//   SUPABASE_URL              config.js 의 SUPABASE_URL 과 동일한 값
//   SUPABASE_SERVICE_ROLE_KEY Supabase > Settings > API 의 service_role 키
//   ALLOWED_TELEGRAM_USER_IDS (선택) 허용할 텔레그램 ID, 쉼표로 구분.
//                             비워두면 전원 허용(권장하지 않음)
//   TELEGRAM_USER_MAP         (선택) 텔레그램 ID → 담당자 이름 매핑,
//                             JSON 문자열. 예: {"123456789":"dongmin.yang"}
//   APP_BASE_URL              (선택) 확인 화면 주소. 비우면 요청 호스트로 추정
//
// ── 파일 지원 범위와 비용 전략 ──────────────────────────────────
// PDF·사진은 Claude에 그대로 올려서(이미지/문서로) 분석합니다 — 이 방식이
// 가장 비쌉니다(비전 분석).
// PPT(.pptx)·워드(.docx)는 npm 패키지 없이(이 프로젝트 전체의 "빌드 도구
// 없음" 원칙 유지) 내장 zlib로 직접 압축을 풀어 글자만 뽑아낸 뒤, 그
// 텍스트를 메시지 본문과 합쳐 '텍스트'로 분석합니다 — 같은 내용이어도
// 파일을 이미지로 읽히는 것보다 훨씬 저렴합니다.
// 예전 바이너리 형식(.doc/.ppt, 2007 이전)은 구조가 복잡해 지원하지
// 않습니다 — .docx/.pptx로 저장해서 다시 보내거나 텍스트로 옮겨달라고
// 안내합니다. 엑셀(.xlsx)·한글(.hwp)도 아직 미지원입니다.
// 비용을 더 줄이려면(가장 저렴한 길은 텍스트 직접 입력) /start 안내에
// 담당자가 핵심만 채워 보낼 수 있는 입력 양식을 함께 보여줍니다.
//
// 원본 파일 자체(PDF·PPT·워드·사진)는 AI 분석과 별개로 기존 'deal-files'
// Storage 버킷에도 올려 둡니다(uploadDraftFile). 담당자가 '텔레그램 접수'
// 화면에서 원본을 내려받아 확인할 수 있고, "딜로 등록"하면 그 딜의
// 첨부파일로 자동 연결됩니다(js/common.js의 confirmDraft). "반려"하면
// 저장공간을 계속 차지하지 않도록 파일도 함께 지웁니다(rejectDraft).

const zlib = require('zlib');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// 파일 대신 텍스트로 핵심만 적어 보내면 AI 분석 비용이 훨씬 저렴합니다
// (이미지/문서 분석이 아니라 일반 텍스트 분석이라 토큰이 적게 듭니다).
// /start 에서 보여주고, 파일을 보냈을 때도 짧게 한 번 더 안내합니다.
const TEXT_TEMPLATE_GUIDE =
  '💡 비용을 아끼려면 파일 대신 아래 양식에 핵심만 채워서 텍스트로 보내주세요(아는 항목만, 나머지는 비워도 됩니다):\n\n' +
  '딜명: \n' +
  '자산군: (기업 Equity·부동산·인프라·기업 Debt·상장주식·메자닌/비상장·공모주·원화채권·해외채권·기타)\n' +
  '딜 규모: \n' +
  '소개자/GP: \n' +
  '투자수단: (대출·사채·보통주·우선주·CB·펀드지분·기타)\n' +
  '통화/검토금액: \n' +
  '만기: \n' +
  '기대수익률: \n' +
  '핵심 투자논거: \n' +
  '주요 위험: \n\n' +
  '(파일로 보내도 되지만, PPT·워드보다 PDF·사진이 더 비싸고, 가장 저렴한 건 이렇게 텍스트로 직접 입력하는 방법입니다)';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).send('ok');
    return;
  }

  // 텔레그램이 보낸 요청인지 확인 (비밀 토큰). 이게 없으면 주소를 아는
  // 누구나 이 함수를 호출해 AI 비용을 쓰게 만들 수 있습니다.
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).send('unauthorized');
    return;
  }

  let update;
  try {
    update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    res.status(200).send('ok'); // 텔레그램 재시도를 막기 위해 일단 200
    return;
  }

  const message = update && update.message;
  const chatId = message && message.chat && message.chat.id;
  if (!message) {
    res.status(200).send('ok');
    return;
  }

  const text = (message.text || message.caption || '').trim();
  const fromId = String((message.from && message.from.id) || '');
  const fromUsername = (message.from && (message.from.username || message.from.first_name)) || '';

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      '딜 접수 봇입니다. 딜 내용을 텍스트로 입력하거나, PDF·PPT·워드·사진으로 보내주세요.\n' +
      'AI가 내용을 정리해두고, 담당자가 확인한 뒤 시스템에 등록됩니다.\n\n' +
      TEXT_TEMPLATE_GUIDE);
    res.status(200).send('ok');
    return;
  }

  if (text === '/myid') {
    await sendTelegramMessage(chatId,
      `회원님의 텔레그램 ID: ${fromId}\n` +
      '이 번호를 운용팀장님께 전달해 사용 등록을 요청하세요.');
    res.status(200).send('ok');
    return;
  }

  // 허용된 사람만 (비용·스팸 방지). 비워두면 검사하지 않습니다.
  const allowed = (process.env.ALLOWED_TELEGRAM_USER_IDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length > 0 && !allowed.includes(fromId)) {
    await sendTelegramMessage(chatId,
      '등록되지 않은 사용자입니다. /myid 로 나오는 번호를 운용팀장님께 전달해 등록을 요청하세요.');
    res.status(200).send('ok');
    return;
  }

  // 첨부파일(문서 또는 사진) 확인
  let fileRef = null;
  if (message.document) {
    fileRef = {
      file_id: message.document.file_id,
      mime_type: message.document.mime_type || '',
      file_name: message.document.file_name || '파일',
    };
  } else if (Array.isArray(message.photo) && message.photo.length > 0) {
    fileRef = { file_id: message.photo[message.photo.length - 1].file_id, mime_type: 'image/jpeg', file_name: '사진' };
  }

  if (!text && !fileRef) {
    await sendTelegramMessage(chatId, '텍스트, PDF·PPT·워드 파일, 또는 사진으로 딜 내용을 보내주세요. (/start 로 입력 양식 보기)');
    res.status(200).send('ok');
    return;
  }

  let fileContent = null;       // Claude에 이미지/문서로 그대로 올릴 내용 (PDF·사진)
  let extractedFileText = null; // 파일에서 글자만 뽑아낸 내용 (PPT·워드) — 텍스트로 분석해 더 저렴함
  let draftFile = null;         // Storage에 올린 원본 파일 정보 { file_path, file_name, file_size }

  if (fileRef) {
    const name = (fileRef.file_name || '').toLowerCase();
    const isPdf = fileRef.mime_type === 'application/pdf' || name.endsWith('.pdf');
    const isImage = fileRef.mime_type.startsWith('image/');
    const isDocx = fileRef.mime_type === DOCX_MIME || name.endsWith('.docx');
    const isPptx = fileRef.mime_type === PPTX_MIME || name.endsWith('.pptx');
    const isLegacyOffice = !isDocx && !isPptx &&
      (name.endsWith('.doc') || name.endsWith('.ppt') ||
       fileRef.mime_type === 'application/msword' || fileRef.mime_type === 'application/vnd.ms-powerpoint');

    if (isLegacyOffice) {
      await sendTelegramMessage(chatId,
        '예전 형식(.doc/.ppt)은 아직 지원하지 않습니다. "다른 이름으로 저장"할 때 .docx/.pptx로 저장해서 다시 보내주시거나, 핵심 내용을 텍스트로 적어 보내주세요.\n\n' + TEXT_TEMPLATE_GUIDE);
      res.status(200).send('ok');
      return;
    }

    if (!isPdf && !isImage && !isDocx && !isPptx) {
      await sendTelegramMessage(chatId,
        `"${fileRef.file_name}" 형식은 아직 지원하지 않습니다. PDF·PPT·워드 파일이나 사진으로 보내거나, 내용을 텍스트로 옮겨 보내주세요.\n\n` + TEXT_TEMPLATE_GUIDE);
      res.status(200).send('ok');
      return;
    }

    try {
      const buf = await downloadTelegramFile(fileRef.file_id);
      if (isDocx) {
        extractedFileText = extractDocxText(buf);
      } else if (isPptx) {
        extractedFileText = extractPptxText(buf);
      } else {
        fileContent = { kind: isPdf ? 'document' : 'image', mediaType: isPdf ? 'application/pdf' : fileRef.mime_type, base64: buf.toString('base64') };
      }
      // 원본 파일도 저장소(Storage)에 올려 둡니다 — AI 분석(위)과 별개로,
      // 담당자가 '텔레그램 접수' 화면에서 원본을 직접 내려받아 확인하고
      // 딜로 등록되면 첨부파일로도 자동 연결됩니다. 이 업로드가 실패해도
      // AI 분석·초안 저장 자체는 계속 진행합니다(원본만 못 남길 뿐).
      try {
        draftFile = await uploadDraftFile(buf, fileRef, isDocx ? DOCX_MIME : isPptx ? PPTX_MIME : null);
      } catch (upErr) {
        console.error('telegram-webhook storage upload error:', upErr);
      }
    } catch (err) {
      console.error('telegram-webhook file error:', err);
      await sendTelegramMessage(chatId,
        '파일을 읽지 못했습니다 (20MB 이하 파일인지, .docx/.pptx 형식이 맞는지 확인해주세요). PDF·사진으로 다시 시도하시거나, 핵심 내용을 텍스트로 적어 보내주세요.');
      res.status(200).send('ok');
      return;
    }
  }

  // PPT·워드에서 뽑아낸 글자는 원래 메시지(캡션) 텍스트와 합쳐서 그대로
  // '텍스트'로 분석합니다. 사진/PDF처럼 이미지로 읽히는 것보다 저렴합니다.
  const analysisText = extractedFileText ? [text, extractedFileText].filter(Boolean).join('\n\n') : text;

  try {
    const parsed = await extractDealFields(analysisText, fileContent);

    let userMap = {};
    try { userMap = JSON.parse(process.env.TELEGRAM_USER_MAP || '{}'); } catch (e) {}
    if (userMap[fromId]) parsed.assigned_to = userMap[fromId];

    await insertDraft({
      raw_message: analysisText || `[첨부파일] ${fileRef.file_name}`,
      telegram_user_id: fromId,
      telegram_username: fromUsername,
      telegram_chat_id: String(chatId),
      parsed,
      file_path: draftFile ? draftFile.file_path : null,
      file_name: draftFile ? draftFile.file_name : null,
      file_size: draftFile ? draftFile.file_size : null,
    });

    const base = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    let reply =
      '접수했습니다 ✅\n' +
      `딜명(추정): ${parsed.deal_name || '(미확인)'}\n` +
      `자산군(추정): ${parsed.asset_class || '(미확인)'}\n\n` +
      `담당자 확인 후 등록됩니다 → ${base}/deal-drafts.html`;
    // 파일로 보냈을 때만 짧게 한 번 더 비용 절감 안내 (텍스트로만 보냈으면 이미 가장 저렴한 방법을 쓴 것이라 생략)
    if (fileRef) {
      reply += '\n\n💡 다음엔 핵심만 텍스트로 적어 보내시면 더 빠르고 저렴해요 (/start 로 양식 다시 보기)';
    }
    await sendTelegramMessage(chatId, reply);

    res.status(200).send('ok');
  } catch (err) {
    console.error('telegram-webhook error:', err);
    if (chatId) {
      await sendTelegramMessage(chatId, '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.').catch(() => {});
    }
    res.status(200).send('ok'); // 오류는 로그로만 남기고, 텔레그램 재시도는 막습니다
  }
}

module.exports = handler;
// PDF·이미지 분석이 텍스트보다 오래 걸릴 수 있어 함수 제한시간을 넉넉히 둠
// (Vercel 기본 10초 → 60초. Hobby 요금제에서도 허용되는 상한)
module.exports.config = { maxDuration: 60 };

// AI(Claude)에게 메시지(와 첨부파일)를 분석시켜 딜 항목을 구조화된 값으로 받습니다.
// fileContent: { kind: 'document'|'image', mediaType, base64 } 또는 null
// (PPT·워드에서 뽑은 글자는 fileContent가 아니라 text 안에 이미 합쳐져 들어옵니다)
async function extractDealFields(text, fileContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다');

  const tool = {
    name: 'save_deal_fields',
    description: '텔레그램 메시지에서 읽어낼 수 있는 투자 딜 정보만 채웁니다.',
    input_schema: {
      type: 'object',
      properties: {
        deal_name: { type: 'string', description: '딜명(프로젝트명). 메시지에 분명한 이름이 없으면 핵심 내용을 20자 내로 요약해서 지음' },
        asset_class: {
          type: 'string',
          enum: ['기업 Equity','부동산','인프라','기업 Debt','상장주식','메자닌/비상장','공모주','원화채권','해외채권','기타'],
          description:
            '자산군 분류. 특히 채권성 자산은 혼동하기 쉬우니 다음 기준으로 구분하세요.\n' +
            '- "원화채권": 원화로 발행되어 채권시장에서 유가증권 형태로 유통되는 채권 전반. ' +
            '일반 회사채, ABS(자산유동화증권), 신종자본증권(영구채·하이브리드채권), 금융채, 국공채 등이 해당합니다. ' +
            '발행사가 일반 기업이어도 이 채권들은 "기업 Debt"가 아니라 "원화채권"입니다.\n' +
            '- "기업 Debt": 비상장 기업을 상대로 한 사모대출·직접대출(private debt/direct lending) 등 ' +
            '채권시장 유가증권이 아닌 당사자 간 개별 여신·대출 계약. 투자수단이 "대출"인 경우가 대부분입니다.\n' +
            '- "해외채권": 외화로 발행되는 채권.',
        },
        deal_size: { type: 'integer', description: '투자 규모, 원 단위 정수. 예: 50억원 → 5000000000' },
        introducer_gp: { type: 'string', description: '소개자 또는 GP명' },
        investment_vehicle: { type: 'string', enum: ['대출','사채','보통주','우선주','CB','펀드지분','기타'] },
        currency: { type: 'string', enum: ['KRW','USD','EUR','JPY','기타'] },
        review_amount: { type: 'integer', description: '당사 검토금액. currency로 답한 통화의 최소 단위 정수(환율 환산 없이 그대로). 예: USD 500만달러 → 5000000, KRW 50억원 → 5000000000' },
        maturity_term: { type: 'string', description: '만기 (자유 입력, 예: 3년)' },
        expected_return: { type: 'string', description: '기대수익률 (자유 입력, 예: 연 8%)' },
        investment_thesis: { type: 'string', description: '핵심 투자논거' },
        key_risks: { type: 'string', description: '주요 위험' },
      },
      required: ['deal_name'],
    },
  };

  const instruction =
    '다음은 투자회사 자산운용팀원이 텔레그램으로 보낸 딜(투자건) 제보입니다' +
    (fileContent ? ' (첨부된 ' + (fileContent.kind === 'document' ? 'PDF 문서' : '사진') + ' 포함)' : '') + '. ' +
    'save_deal_fields 도구를 호출해서 실제로 확인되는 값만 채우세요. ' +
    '모르는 항목은 지어내지 말고 비워두세요.' +
    (text ? '\n\n--- 메시지 ---\n' + text : '');

  const content = [];
  if (fileContent) {
    content.push(fileContent.kind === 'document'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileContent.base64 } }
      : { type: 'image', source: { type: 'base64', media_type: fileContent.mediaType, data: fileContent.base64 } });
  }
  content.push({ type: 'text', text: instruction });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-5-5',
      max_tokens: 1024,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'save_deal_fields' },
      messages: [{ role: 'user', content }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`AI 분석 실패 (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  const toolUse = (data.content || []).find(c => c.type === 'tool_use');
  if (!toolUse) throw new Error('AI 가 구조화된 결과를 반환하지 않았습니다');
  return toolUse.input || {};
}

// Supabase REST API로 초안을 저장합니다 (service_role 키 사용 → RLS 무시).
async function insertDraft(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다');

  const resp = await fetch(`${url}/rest/v1/deal_drafts`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'apikey': key,
      'authorization': `Bearer ${key}`,
      'prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`DB 저장 실패 (${resp.status}): ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data[0];
}

// 텔레그램에서 받은 원본 파일을 기존 'deal-files' Storage 버킷에 올립니다.
// service_role 키를 쓰므로 버킷 RLS(로그인 사용자 전용)와 무관하게 저장할 수
// 있습니다. 경로는 화면의 uploadFile()과 같은 이유로 원본 파일명을 쓰지
// 않고 난수를 씁니다(한글 파일명 업로드 실패·주입 경로 방지). 딜별 폴더가
// 아직 없는 '초안' 단계라 drafts/ 아래 둡니다 — 딜로 등록되면 deal_files에
// 같은 경로를 그대로 연결하고(confirmDraft), 반려되면 이 경로의 파일을
// 지웁니다(rejectDraft, common.js).
async function uploadDraftFile(buf, fileRef, fallbackMimeType) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았습니다');

  const extMatch = (fileRef.file_name || '').match(/\.([A-Za-z0-9]{1,10})$/);
  const extByMime = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = extMatch ? extMatch[1].toLowerCase() : (extByMime[fileRef.mime_type] || '');
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `drafts/${Date.now()}_${rand}${ext ? '.' + ext : ''}`;
  const contentType = fileRef.mime_type || fallbackMimeType || 'application/octet-stream';

  const resp = await fetch(`${url}/storage/v1/object/deal-files/${path}`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${key}`,
      'apikey': key,
      'content-type': contentType,
    },
    body: buf,
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Storage 업로드 실패 (${resp.status}): ${errText.slice(0, 200)}`);
  }
  return { file_path: path, file_name: fileRef.file_name || '파일', file_size: buf.length };
}

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

// 텔레그램이 보관 중인 파일을 받아와 Buffer로 돌려줍니다.
// 봇 API 는 20MB 넘는 파일은 이 방식으로 못 받습니다(텔레그램 자체 제한).
async function downloadTelegramFile(fileId) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN 이 설정되지 않았습니다');

  const infoResp = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const info = await infoResp.json();
  if (!info.ok || !info.result || !info.result.file_path) {
    throw new Error('파일 정보를 가져오지 못했습니다 (' + (info.description || 'unknown') + ')');
  }

  const fileResp = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`);
  if (!fileResp.ok) throw new Error('파일 다운로드 실패: ' + fileResp.status);

  const arrayBuffer = await fileResp.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ── 최소 ZIP 리더 (.docx/.pptx 는 사실 ZIP 압축 파일입니다) ─────────
// npm 패키지(예: jszip) 없이 이 프로젝트 전체의 "빌드 도구 없음" 원칙을
// 지키려고, 내장 zlib(raw deflate)만으로 필요한 항목만 직접 풀어냅니다.
// ZIP의 '중앙 디렉터리(central directory)'에서 파일 목록을 읽고, 필요한
// 항목만 '로컬 파일 헤더' 위치로 찾아가 압축을 풉니다.
function unzipAll(buf) {
  // 파일 맨 끝의 EOCD(End Of Central Directory) 레코드를 찾습니다.
  // 보통 파일 끝 22바이트 근처에 있지만, 주석이 있으면 더 앞쪽일 수
  // 있어 뒤에서부터 최대 66KB 범위를 탐색합니다(ZIP 주석 최대 길이).
  const searchStart = Math.max(0, buf.length - 22 - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error('ZIP 구조를 읽을 수 없습니다(.docx/.pptx 파일이 맞는지 확인 필요)');

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const cdEntries = buf.readUInt16LE(eocdOffset + 10);

  const entries = {};
  let offset = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) break; // 중앙 디렉터리 시그니처 불일치 → 중단
    const method = buf.readUInt16LE(offset + 10);
    const compSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
    entries[name] = { method, compSize, localHeaderOffset };
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return { buf, entries };
}

function readZipEntry(zip, name) {
  const e = zip.entries[name];
  if (!e) return null;
  const buf = zip.buf;
  // 로컬 파일 헤더는 중앙 디렉터리와 필드 길이가 다를 수 있어 따로 읽어야 합니다.
  const lfNameLen = buf.readUInt16LE(e.localHeaderOffset + 26);
  const lfExtraLen = buf.readUInt16LE(e.localHeaderOffset + 28);
  const dataStart = e.localHeaderOffset + 30 + lfNameLen + lfExtraLen;
  const compData = buf.slice(dataStart, dataStart + e.compSize);
  if (e.method === 0) return compData;               // 저장(비압축)
  if (e.method === 8) return zlib.inflateRawSync(compData); // DEFLATE
  throw new Error('지원하지 않는 압축 방식입니다 (method ' + e.method + ')');
}

function decodeXmlEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&'); // 다른 엔티티들을 먼저 풀어야 &amp; 이 마지막에 안전하게 풀림
}

// word/document.xml 에서 문단 단위로 글자만 뽑아냅니다. <w:t>텍스트</w:t> 가
// 실제 글자가 들어있는 태그이고, </w:p> 가 문단 끝입니다.
function extractDocxText(buf) {
  const zip = unzipAll(buf);
  const xmlBuf = readZipEntry(zip, 'word/document.xml');
  if (!xmlBuf) throw new Error('word/document.xml 을 찾을 수 없습니다 (.docx 형식이 맞는지 확인 필요)');
  const xml = xmlBuf.toString('utf8');

  const paragraphs = xml.split('</w:p>');
  const lines = paragraphs
    .map(p => [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => decodeXmlEntities(m[1])).join(''))
    .filter(line => line.trim());
  return lines.join('\n').slice(0, 8000); // 너무 길면 AI 호출 비용·시간이 커지므로 적당히 자름
}

// ppt/slides/slideN.xml 각각에서 글자를 뽑아 슬라이드 번호와 함께 모읍니다.
// <a:t>텍스트</a:t> 가 실제 글자가 들어있는 태그입니다.
function extractPptxText(buf) {
  const zip = unzipAll(buf);
  const slideNames = Object.keys(zip.entries)
    .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)\.xml/)[1], 10);
      const nb = parseInt(b.match(/slide(\d+)\.xml/)[1], 10);
      return na - nb;
    });
  if (slideNames.length === 0) throw new Error('슬라이드를 찾을 수 없습니다 (.pptx 형식이 맞는지 확인 필요)');

  const slides = slideNames.map((name, i) => {
    const xml = readZipEntry(zip, name).toString('utf8');
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => decodeXmlEntities(m[1])).join(' ');
    return text.trim() ? `[슬라이드 ${i + 1}] ${text.trim()}` : '';
  }).filter(Boolean);
  return slides.join('\n').slice(0, 8000); // 너무 길면 AI 호출 비용·시간이 커지므로 적당히 자름
}
