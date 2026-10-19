-- ================================================================
-- "다음 액션·기한" 기능 추가 — deals 테이블에 컬럼 4개 추가
-- 2026-10  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   딜마다 "다음에 뭘 해야 하는지(next_action)", "누가(next_action_owner)",
--   "언제까지(next_action_due)", "왜 대기 중인지(next_action_note)"를
--   적을 수 있는 칸 4개가 deals 테이블에 추가됩니다.
--
--   이미 들어가 있는 247건을 포함해 기존 딜은 전부 이 칸이 빈 값(NULL)으로
--   시작합니다. 데이터가 지워지거나 바뀌는 건 없고, 칸만 늘어납니다.
--   RLS(접근 권한) 정책은 테이블 단위라서 새로 손댈 필요가 없습니다.
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 그대로
-- 넘어갑니다 (IF NOT EXISTS).
-- ================================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS next_action       TEXT,  -- 다음에 할 일 (예: "수정 조건표 수령 대기")
  ADD COLUMN IF NOT EXISTS next_action_owner TEXT,  -- 다음 액션 담당자
  ADD COLUMN IF NOT EXISTS next_action_due   DATE,  -- 기한
  ADD COLUMN IF NOT EXISTS next_action_note  TEXT;  -- 대기 사유 / 메모

COMMENT ON COLUMN deals.next_action       IS '다음에 해야 할 일 (자유 입력). 2026-10 추가';
COMMENT ON COLUMN deals.next_action_owner IS '다음 액션을 수행할 담당자. 2026-10 추가';
COMMENT ON COLUMN deals.next_action_due   IS '다음 액션 기한. 2026-10 추가';
COMMENT ON COLUMN deals.next_action_note  IS '대기 사유 등 메모. 2026-10 추가';

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- 아래를 실행해서 4개 컬럼이 보이면 정상적으로 추가된 것입니다.
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'deals' AND column_name LIKE 'next_action%';
