-- ================================================================
-- "단계/상태 분리" 기능 추가 — deals 테이블에 review_status 컬럼 추가
-- 2026-10  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   지금까지는 "현재 단계"(접수/1차검토/심층검토/IC/투자확정/패스) 하나로만
--   딜을 구분했습니다. 여기에 "상태"(진행/외부회신 대기/보류/종결)를
--   별도로 추가해서, 같은 '심층검토' 단계라도 실제로 움직이는 딜과
--   오래 멈춰 있는 딜을 구분할 수 있게 합니다.
--
--   기존 247건을 포함한 모든 딜은 이 SQL을 실행하는 순간 자동으로
--   상태 = '진행'으로 채워집니다(DEFAULT 값이 기존 행에도 적용됩니다).
--   따로 손으로 채울 필요가 없습니다.
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다.
-- ================================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT '진행';

COMMENT ON COLUMN deals.review_status IS '검토 상태: 진행/외부회신 대기/보류/종결. 2026-10 추가';

-- 허용값 제약 (다시 실행해도 오류가 나지 않도록 먼저 제거 후 추가)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_review_status;
ALTER TABLE deals
  ADD CONSTRAINT chk_review_status
    CHECK (review_status IN ('진행','외부회신 대기','보류','종결'));

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- 아래를 실행해서 상태별 건수가 나오면 정상적으로 추가된 것입니다.
-- SELECT review_status, COUNT(*) FROM deals GROUP BY review_status;
