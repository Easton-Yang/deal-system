-- ================================================================
-- "패스 사유·재검토 조건" 기능 추가 — deals 테이블에 컬럼 3개 추가
-- 2026-10  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   딜을 "패스"로 처리할 때 왜 패스했는지(가격/구조/신용/한도/일정/기타 중
--   분류 하나 + 자유 메모)와, 나중에 같은 딜이 다시 들어왔을 때 참고할
--   "재검토 조건"을 함께 기록할 수 있게 됩니다. 과거 판단 근거를 다음에
--   재활용하기 위한 것입니다.
--
--   기존 딜은 전부 빈 값(NULL)으로 시작합니다. 과거에 이미 패스 처리된
--   딜의 사유를 소급해서 채워 넣을 필요는 없습니다.
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다.
-- ================================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS pass_reason         TEXT,  -- 패스 사유 분류: 가격/구조/신용/한도/일정/기타
  ADD COLUMN IF NOT EXISTS pass_reason_note     TEXT,  -- 패스 사유 상세 메모
  ADD COLUMN IF NOT EXISTS reconsider_condition TEXT;  -- 재검토 조건 (예: 가격을 10% 낮추면 재검토)

COMMENT ON COLUMN deals.pass_reason         IS '패스 사유 분류. 2026-10 추가';
COMMENT ON COLUMN deals.pass_reason_note     IS '패스 사유 상세 메모. 2026-10 추가';
COMMENT ON COLUMN deals.reconsider_condition IS '재검토 조건(자유 입력). 2026-10 추가';

-- 허용값 제약 (다시 실행해도 오류가 나지 않도록 먼저 제거 후 추가)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_pass_reason;
ALTER TABLE deals
  ADD CONSTRAINT chk_pass_reason
    CHECK (pass_reason IN ('가격','구조','신용','한도','일정','기타') OR pass_reason IS NULL);

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'deals' AND column_name IN
--   ('pass_reason','pass_reason_note','reconsider_condition');
