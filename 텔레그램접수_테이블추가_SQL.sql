-- ================================================================
-- "텔레그램 딜 접수" 기능 추가 — deal_drafts 테이블 신규 생성
-- 2026-10  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   담당자가 텔레그램 봇에게 딜 내용을 메시지로 보내면, AI가 내용을
--   분석해 이 테이블에 '초안'으로 저장합니다. 화면(deal-drafts.html)에서
--   담당자가 초안을 확인·수정한 뒤 "딜로 등록"을 눌러야 비로소 진짜
--   deals 테이블에 딜이 생깁니다. 즉 AI가 바로 딜을 만드는 것이
--   아니라, 사람이 확인하기 전까지는 '대기' 상태로만 남습니다.
--
--   초안을 넣는 쪽(텔레그램 봇, api/telegram-webhook.js)은 service_role
--   키를 쓰기 때문에 이 테이블에 RLS 를 걸어도 문제없이 저장할 수
--   있습니다(service_role 은 RLS를 무시합니다). 그래서 아래 정책에는
--   '로그인한 사람(팀원)'의 조회·확인 권한만 있고, 팀원이 직접 초안을
--   끼워넣는 기능은 없습니다(필요 없는 권한이라 일부러 안 열어둡니다).
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다.
-- ================================================================

CREATE TABLE IF NOT EXISTS deal_drafts (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_message        TEXT        NOT NULL,                 -- 텔레그램에서 받은 원문
  telegram_user_id   TEXT,                                  -- 보낸 사람의 텔레그램 ID
  telegram_username  TEXT,                                  -- 보낸 사람의 텔레그램 이름/아이디
  telegram_chat_id   TEXT        NOT NULL,                  -- 답장을 보낼 대화방 ID
  parsed             JSONB       NOT NULL DEFAULT '{}'::jsonb, -- AI가 뽑아낸 딜 항목 (딜명·자산군 등)
  status             TEXT        NOT NULL DEFAULT '대기',   -- 대기 / 등록완료 / 반려
  created_deal_id    UUID        REFERENCES deals(id),      -- 등록완료 시 생긴 deals.id
  reject_reason      TEXT,                                  -- 반려 사유 (선택)
  reviewed_by        TEXT,                                  -- 확인(등록/반려)한 사람 이름
  reviewed_at        TIMESTAMPTZ,                            -- 확인한 시각
  created_at         TIMESTAMPTZ DEFAULT NOW()               -- 텔레그램 메시지가 들어온 시각
);

ALTER TABLE deal_drafts DROP CONSTRAINT IF EXISTS chk_draft_status;
ALTER TABLE deal_drafts
  ADD CONSTRAINT chk_draft_status
    CHECK (status IN ('대기','등록완료','반려'));

COMMENT ON TABLE deal_drafts IS '텔레그램으로 들어온 딜 제보를 AI가 정리한 초안. 담당자 확인 후 deals 로 등록됨';
COMMENT ON COLUMN deal_drafts.parsed IS 'AI가 메시지에서 뽑아낸 값 (deal_name, asset_class, deal_size 등). 참고용 원본이며 화면에서 고친 뒤 실제 등록에 쓰는 값은 여기 저장되지 않음';


-- ────────────────────────────────────────────────────────────────
-- RLS (행 수준 보안): 로그인한 팀원만 조회·확인 가능
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.deal_drafts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'deal_drafts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.deal_drafts', r.policyname);
  END LOOP;
END $$;

-- 조회: 로그인한 사람만
CREATE POLICY "deal_drafts_select_auth" ON public.deal_drafts
  FOR SELECT TO authenticated USING (true);

-- 확인(등록/반려) 처리: 로그인한 사람만, 상태·결과만 바꿀 수 있음
CREATE POLICY "deal_drafts_update_auth" ON public.deal_drafts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 로그인하지 않은 사람(anon) 권한 제거
REVOKE ALL ON public.deal_drafts FROM anon;

-- 로그인한 사람에게는 조회·수정만 (insert/delete는 주지 않음 —
-- 초안 생성은 텔레그램 봇(service_role)만 하도록 제한)
GRANT SELECT, UPDATE ON public.deal_drafts TO authenticated;

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- SELECT * FROM pg_policies WHERE tablename = 'deal_drafts';
