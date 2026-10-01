-- ================================================================
-- 딜 접수·관리 시스템 — Supabase (PostgreSQL) DB 스키마
-- 버전: v1.0  |  2026-06-19  |  자산운용팀
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
-- ================================================================


-- ──────────────────────────────────────────────────────────────
-- 1. deals 테이블 (핵심 딜 정보)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_name       TEXT        NOT NULL,                        -- 딜명 (프로젝트명)
  intake_channel  TEXT        NOT NULL,                        -- 인입경로: 이메일/카카오톡/텔레그램/기타
  intake_date     DATE        NOT NULL,                        -- 딜 최초 인입일자
  asset_class     TEXT        NOT NULL,                        -- 자산군(세부유형): PE/VC/부동산/인프라/사모크레딧/상장주식/메자닌·비상장/공모주/원화채권/해외채권/기타
  assigned_to     TEXT        NOT NULL,                        -- 담당자 이름 ('미배정' 허용)
  deal_size       BIGINT,                                      -- 투자 규모 (원 단위, NULL 허용)
  introducer_gp   TEXT,                                        -- 소개자 또는 GP명 (NULL 허용)
  current_stage   TEXT        NOT NULL DEFAULT '접수',         -- 현재 검토 단계
  first_opinion   TEXT,                                        -- 1차 검토 의견 (NULL 허용)
  final_result    TEXT,                                        -- 최종 결과: 투자/패스/보류 (NULL=미결정)
  created_at      TIMESTAMPTZ DEFAULT NOW(),                   -- 최초 등록 일시
  updated_at      TIMESTAMPTZ DEFAULT NOW()                    -- 최종 수정 일시 (트리거로 자동 갱신)
);

-- 허용값 제약 (운영 정책에 따라 추가 값 삽입 가능)
ALTER TABLE deals
  ADD CONSTRAINT chk_intake_channel
    CHECK (intake_channel IN ('이메일','카카오톡','텔레그램','기타')),
  ADD CONSTRAINT chk_asset_class
    CHECK (asset_class IN ('PE/VC','부동산','인프라','사모크레딧',
                           '상장주식','메자닌/비상장','공모주',
                           '원화채권','해외채권','기타')),
  ADD CONSTRAINT chk_current_stage
    CHECK (current_stage IN ('접수','1차검토','심층검토','IC','투자확정','패스')),
  ADD CONSTRAINT chk_final_result
    CHECK (final_result IN ('투자','패스','보류') OR final_result IS NULL);

COMMENT ON TABLE deals IS '딜(투자건) 기본 정보 테이블';
COMMENT ON COLUMN deals.deal_size IS '원 단위 정수. 예: 50억원 = 5000000000';
COMMENT ON COLUMN deals.current_stage IS '현재 검토 단계. 접수/1차검토/심층검토/IC/투자확정/패스';
COMMENT ON COLUMN deals.updated_at IS 'deals_set_updated_at 트리거가 UPDATE 시 자동 갱신';


-- ──────────────────────────────────────────────────────────────
-- 2. deal_stage_history 테이블 (단계 변경 이력)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     UUID        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  stage       TEXT        NOT NULL,       -- 변경된 단계명
  changed_at  TIMESTAMPTZ DEFAULT NOW(),  -- 변경 일시
  changed_by  TEXT                        -- 변경한 사용자 이름 (NULL 허용)
);

CREATE INDEX IF NOT EXISTS idx_stage_history_deal_id ON deal_stage_history(deal_id);

COMMENT ON TABLE deal_stage_history IS '딜 단계 변경 이력. 단계 변경 시 애플리케이션이 자동 삽입.';


-- ──────────────────────────────────────────────────────────────
-- 3. deal_notes 테이블 (검토 메모)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id     UUID        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  note_text   TEXT        NOT NULL,       -- 메모 내용 (줄바꿈 포함 자유 입력)
  author      TEXT        NOT NULL,       -- 작성자 이름
  created_at  TIMESTAMPTZ DEFAULT NOW()   -- 작성 일시
);

CREATE INDEX IF NOT EXISTS idx_notes_deal_id ON deal_notes(deal_id);

COMMENT ON TABLE deal_notes IS '딜 검토 메모. 타임라인 형식으로 화면에 표시됨.';


-- ──────────────────────────────────────────────────────────────
-- 4. deal_files 테이블 (첨부 파일 메타데이터)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_files (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id      UUID        NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  file_name    TEXT        NOT NULL,     -- 업로드 원본 파일명
  file_path    TEXT,                     -- Supabase Storage 저장 경로 (NULL = 데모 모드)
  file_size    BIGINT,                   -- 파일 크기 (바이트, NULL 허용)
  uploaded_by  TEXT,                     -- 업로드한 사용자 이름
  uploaded_at  TIMESTAMPTZ DEFAULT NOW() -- 업로드 일시
);

CREATE INDEX IF NOT EXISTS idx_files_deal_id ON deal_files(deal_id);

COMMENT ON TABLE deal_files IS '딜 첨부 파일 메타데이터. 실제 파일은 Supabase Storage 버킷 deal-files 에 저장.';
COMMENT ON COLUMN deal_files.file_path IS 'Storage 경로 형식: {deal_id}/{timestamp}_{file_name}';


-- ──────────────────────────────────────────────────────────────
-- 5. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_set_updated_at ON deals;
CREATE TRIGGER deals_set_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ──────────────────────────────────────────────────────────────
-- 6. Row Level Security (RLS) 설정  ★ 기본값: 잠김
-- ──────────────────────────────────────────────────────────────
-- [2026-10-01 변경] 이전 버전은 RLS를 '비활성화'로 두고 잠금 정책을
-- 주석 처리해 두었습니다. 그 상태로 배포하면 API 주소와 anon key만
-- 알면 누구나 딜 데이터를 조회·수정·삭제할 수 있습니다.
-- (운영 전에 풀라는 주석만으로는 실제로 풀리지 않았습니다.)
-- 그래서 '잠긴 상태'를 기본값으로 바꿨습니다.
--
-- 역할 이름의 뜻
--   anon          = 로그인하지 않은 요청 (API 주소만 알면 누구나)
--   authenticated = Supabase Auth 로그인에 성공한 요청
--
-- 아래 권한은 화면이 실제로 수행하는 동작과 정확히 일치시켰습니다.
--   deals                조회·추가·수정·삭제
--   deal_stage_history   조회·추가            (이력이므로 수정·삭제 없음)
--   deal_notes           조회·추가·삭제        (수정 기능 없음)
--   deal_files           조회·추가·삭제        (수정 기능 없음)
-- 딜을 삭제하면 하위 메모·이력·첨부는 외래키 ON DELETE CASCADE가 처리하며,
-- 이 동작은 참조 무결성 작업이라 RLS와 권한 검사를 거치지 않습니다.
-- 따라서 하위 테이블에 추가 권한을 줄 필요가 없습니다.

-- RLS 활성화
ALTER TABLE deals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_files         ENABLE ROW LEVEL SECURITY;

-- 기존 정책을 '전부' 제거합니다 (이름을 하드코딩하지 않습니다)
--
-- 이름을 하나하나 적어 지우면, 다른 이름으로 만들어진 느슨한 정책이
-- 살아남습니다. PostgreSQL 은 허용 정책을 OR 로 합치므로, 그런 정책이
-- 하나라도 남으면 아래 authenticated 전용 정책을 추가해도 느슨한 쪽이
-- 이깁니다. 즉 잠금이 걸리지 않습니다.
--
-- (실제 사례: 이 시스템의 클라우드 프로젝트에 로그인 기능이 없던 시절
--  'TO anon' 전체 허용 정책 anon_all_deals 등이 만들어져 있었고,
--  이름을 하드코딩해 지우는 방식으로는 제거되지 않았습니다.)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('deals', 'deal_stage_history', 'deal_notes', 'deal_files')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE '기존 정책 제거: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;

-- deals
CREATE POLICY "deals_select_auth" ON deals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert_auth" ON deals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deals_update_auth" ON deals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "deals_delete_auth" ON deals
  FOR DELETE TO authenticated USING (true);

-- deal_stage_history (단계 이력 — 기록이므로 수정·삭제 정책을 두지 않습니다)
CREATE POLICY "history_select_auth" ON deal_stage_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert_auth" ON deal_stage_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- deal_notes (메모)
CREATE POLICY "notes_select_auth" ON deal_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert_auth" ON deal_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notes_delete_auth" ON deal_notes
  FOR DELETE TO authenticated USING (true);

-- deal_files (첨부파일 목록)
CREATE POLICY "files_select_auth" ON deal_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert_auth" ON deal_files
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "files_delete_auth" ON deal_files
  FOR DELETE TO authenticated USING (true);

-- 비로그인(anon) 권한 회수 — RLS와 두 겹으로 막습니다
REVOKE ALL ON deals              FROM anon;
REVOKE ALL ON deal_stage_history FROM anon;
REVOKE ALL ON deal_notes         FROM anon;
REVOKE ALL ON deal_files         FROM anon;

-- 로그인 사용자에게 필요한 권한만 명시적으로 부여
GRANT SELECT, INSERT, UPDATE, DELETE ON deals              TO authenticated;
GRANT SELECT, INSERT                 ON deal_stage_history TO authenticated;
GRANT SELECT, INSERT, DELETE         ON deal_notes         TO authenticated;
GRANT SELECT, INSERT, DELETE         ON deal_files         TO authenticated;

-- ── 역할 구분(팀장만 수정·삭제)이 필요해지면 ────────────────
-- 현재는 로그인한 팀원 4명이 모든 딜을 조회·수정할 수 있습니다.
-- 팀장만 삭제 가능하게 하려면, Supabase Auth 사용자의
-- user_metadata 에 role 을 넣고 아래처럼 조건을 바꾸면 됩니다.
--
--   DROP POLICY "deals_delete_auth" ON deals;
--   CREATE POLICY "deals_delete_admin" ON deals
--     FOR DELETE TO authenticated
--     USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
--
-- ※ 담당자 본인 딜만 수정하게 제한하려면 deals.assigned_to 를
--   로그인 아이디와 비교해야 하므로, assigned_to 표기를
--   계정 아이디와 일치시켜야 합니다(01_src/js/config.js 주석 참고).

-- ── 개발·테스트 중 일시적으로 풀어야 할 때만 ────────────────
-- ※ 풀린 동안은 누구나 접근 가능합니다. 반드시 되돌리세요.
/*
ALTER TABLE deals              DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes         DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_files         DISABLE ROW LEVEL SECURITY;
*/

-- ──────────────────────────────────────────────────────────────
-- 7. Supabase Storage 버킷 생성
-- ──────────────────────────────────────────────────────────────
-- SQL Editor에서는 Storage 버킷을 직접 생성할 수 없습니다.
-- Supabase 대시보드 > Storage > New bucket 에서 수동 생성하세요:
--   버킷명: deal-files
--   Public:  비공개 (Private)
--   파일 크기 제한: 52428800 (50MB)


-- ──────────────────────────────────────────────────────────────
-- 8. 초기 데이터
-- ──────────────────────────────────────────────────────────────
-- 실제 딜 목록(2026.1Q·2Q, 247건)은 별도 파일 03_initial_data.sql 로 제공합니다.


-- ──────────────────────────────────────────────────────────────
-- 9. 유용한 조회 쿼리 (개발·운영 참고용)
-- ──────────────────────────────────────────────────────────────

-- 전체 딜 목록 (최신순)
-- SELECT * FROM deals ORDER BY created_at DESC;

-- 단계별 딜 건수
-- SELECT current_stage, COUNT(*) AS cnt FROM deals GROUP BY current_stage ORDER BY MIN(ARRAY_POSITION(ARRAY['접수','1차검토','심층검토','IC','투자확정','패스'], current_stage));

-- 이번 달 신규 접수
-- SELECT COUNT(*) FROM deals WHERE DATE_TRUNC('month', intake_date) = DATE_TRUNC('month', CURRENT_DATE);

-- 특정 딜의 단계 이력 전체
-- SELECT stage, changed_at, changed_by FROM deal_stage_history WHERE deal_id = 'YOUR_DEAL_ID' ORDER BY changed_at;

-- 담당자별 딜 현황
-- SELECT assigned_to, current_stage, COUNT(*) FROM deals GROUP BY assigned_to, current_stage ORDER BY assigned_to;

-- 자산군별 총 투자 규모
-- SELECT asset_class, COUNT(*) AS cnt, SUM(deal_size)/100000000 AS total_eok FROM deals WHERE deal_size IS NOT NULL GROUP BY asset_class ORDER BY total_eok DESC;
