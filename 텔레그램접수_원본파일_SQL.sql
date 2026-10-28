-- ================================================================
-- "텔레그램 딜 접수" 원본 파일 저장 — deal_drafts 테이블에 칼럼 추가
-- 2026-10  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   지금까지는 텔레그램으로 보낸 PDF·PPT·워드·사진을 AI 분석에만 쓰고
--   버렸습니다(원본은 저장하지 않음). 이제 원본 파일도 기존 'deal-files'
--   저장소 버킷에 함께 올려서, 담당자가 "텔레그램 접수" 화면에서 원본을
--   내려받아 확인할 수 있고, "딜로 등록"을 누르면 그 딜의 첨부파일로
--   자동 연결됩니다. "반려"하면 저장공간을 계속 차지하지 않도록 원본
--   파일도 함께 지웁니다.
--
--   웹훅(api/telegram-webhook.js)은 service_role 키로 올리므로 이
--   테이블·버킷의 RLS와 무관하게 저장할 수 있습니다. 버킷 정책은 이미
--   '보안설정_SQL.sql' · '02_storage_bucket.sql'로 되어 있어 추가 변경이
--   필요 없습니다(이 SQL은 deal_drafts 테이블 칼럼 추가만 합니다).
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다.
-- ================================================================

ALTER TABLE deal_drafts ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE deal_drafts ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE deal_drafts ADD COLUMN IF NOT EXISTS file_size BIGINT;

COMMENT ON COLUMN deal_drafts.file_path IS '텔레그램 원본 파일이 저장된 Storage 경로 (deal-files 버킷, drafts/ 아래). 반려되면 파일과 함께 비워짐';
COMMENT ON COLUMN deal_drafts.file_name IS '텔레그램에서 받은 원본 파일명';
COMMENT ON COLUMN deal_drafts.file_size IS '원본 파일 용량(바이트)';

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'deal_drafts' AND column_name IN ('file_path','file_name','file_size');
-- → 3행 모두 나오면 정상
