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

module.exports = async function handler(req, res) {
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

  if (!message || typeof message.text !== 'string') {
    if (chatId) await sendTelegramMessage(chatId, '텍스트로 딜 내용을 보내주세요. (사진·파일은 아직 지원하지 않습니다)');
    res.status(200).send('ok');
    return;
  }

  const text = message.text.trim();
  const fromId = String((message.from && message.from.id) || '');
  const fromUsername = (message.from && (message.from.username || message.from.first_name)) || '';

  if (text === '/start') {
    await sendTelegramMessage(chatId,
      '딜 접수 봇입니다. 딜 내용을 자유롭게 입력해 보내주세요.\n' +
      'AI가 내용을 정리해두고, 담당자가 확인한 뒤 시스템에 등록됩니다.');
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

  try {
    const parsed = await extractDealFields(text);

    let userMap = {};
    try { userMap = JSON.parse(process.env.TELEGRAM_USER_MAP || '{}'); } catch (e) {}
    if (userMap[fromId]) parsed.assigned_to = userMap[fromId];

    await insertDraft({
      raw_message: text,
      telegram_user_id: fromId,
      telegram_username: fromUsername,
      telegram_chat_id: String(chatId),
      parsed,
    });

    const base = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    await sendTelegramMessage(chatId,
      '접수했습니다 ✅\n' +
      `딜명(추정): ${parsed.deal_name || '(미확인)'}\n` +
      `자산군(추정): ${parsed.asset_class || '(미확인)'}\n\n` +
      `담당자 확인 후 등록됩니다 → ${base}/deal-drafts.html`);

    res.status(200).send('ok');
  } catch (err) {
    console.error('telegram-webhook error:', err);
    if (chatId) {
      await sendTelegramMessage(chatId, '처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.').catch(() => {});
    }
    res.status(200).send('ok'); // 오류는 로그로만 남기고, 텔레그램 재시도는 막습니다
  }
};

// AI(Claude)에게 메시지를 분석시켜 딜 항목을 구조화된 값으로 받습니다.
async function extractDealFields(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 가 설정되지 않았습니다');

  const tool = {
    name: 'save_deal_fields',
    description: '텔레그램 메시지에서 읽어낼 수 있는 투자 딜 정보만 채웁니다.',
    input_schema: {
      type: 'object',
      properties: {
        deal_name: { type: 'string', description: '딜명(프로젝트명). 메시지에 분명한 이름이 없으면 핵심 내용을 20자 내로 요약해서 지음' },
        asset_class: { type: 'string', enum: ['PE/VC','부동산','인프라','사모크레딧','상장주식','메자닌/비상장','공모주','원화채권','해외채권','기타'] },
        deal_size: { type: 'integer', description: '투자 규모, 원 단위 정수. 예: 50억원 → 5000000000' },
        introducer_gp: { type: 'string', description: '소개자 또는 GP명' },
        investment_vehicle: { type: 'string', enum: ['대출','사채','보통주','우선주','CB','펀드지분','기타'] },
        currency: { type: 'string', enum: ['KRW','USD','EUR','JPY','기타'] },
        review_amount: { type: 'integer', description: '당사 검토금액, 원 단위 정수' },
        maturity_term: { type: 'string', description: '만기 (자유 입력, 예: 3년)' },
        expected_return: { type: 'string', description: '기대수익률 (자유 입력, 예: 연 8%)' },
        investment_thesis: { type: 'string', description: '핵심 투자논거' },
        key_risks: { type: 'string', description: '주요 위험' },
      },
      required: ['deal_name'],
    },
  };

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
      messages: [{
        role: 'user',
        content:
          '다음은 투자회사 자산운용팀원이 텔레그램으로 보낸 딜(투자건) 제보 메시지입니다. ' +
          'save_deal_fields 도구를 호출해서 메시지에 실제로 적힌 값만 채우세요. ' +
          '모르는 항목은 지어내지 말고 비워두세요.\n\n--- 메시지 ---\n' + text,
      }],
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

async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}
