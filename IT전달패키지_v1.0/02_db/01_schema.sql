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
-- 6. Row Level Security (RLS) 설정
-- ──────────────────────────────────────────────────────────────
-- [주의] 초기 개발·테스트 단계에서는 RLS를 비활성화합니다.
-- 운영 배포 전 반드시 아래 RLS 정책을 적용하고 Supabase Auth 연동을 완료하세요.

-- 개발 단계: RLS 비활성화 (모든 인증 사용자 접근 허용)
ALTER TABLE deals             DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE deal_files        DISABLE ROW LEVEL SECURITY;

-- ── 운영 배포 시 아래 주석 해제 ──────────────────────────────
/*
-- RLS 활성화
ALTER TABLE deals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_files         ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 전체 조회 가능
CREATE POLICY "authenticated_select_deals"
  ON deals FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_history"
  ON deal_stage_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_notes"
  ON deal_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_select_files"
  ON deal_files FOR SELECT TO authenticated USING (true);

-- 인증된 사용자는 삽입 가능
CREATE POLICY "authenticated_insert_deals"
  ON deals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_insert_history"
  ON deal_stage_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_insert_notes"
  ON deal_notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_insert_files"
  ON deal_files FOR INSERT TO authenticated WITH CHECK (true);

-- 수정: 팀장(admin) 역할은 전체, 일반 사용자는 담당 딜만
-- (Supabase Auth custom claims 또는 별도 users 테이블로 역할 관리 필요)
CREATE POLICY "authenticated_update_deals"
  ON deals FOR UPDATE TO authenticated USING (true);

-- 삭제: 팀장만 (별도 역할 관리 후 조건 수정)
CREATE POLICY "authenticated_delete_deals"
  ON deals FOR DELETE TO authenticated USING (true);
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
