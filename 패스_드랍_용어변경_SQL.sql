-- ================================================================
-- 단계·결과 명칭 변경 — '패스' → '드랍'
-- 2026-10-27  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   딜을 더 이상 진행하지 않기로 할 때의 단계·결과 이름이 '패스'에서
--   '드랍'으로 바뀝니다. 다른 단계 이름(접수/1차검토/심층검토/IC/투자확정)과
--   딜 규모·담당자 등 다른 값은 전혀 건드리지 않습니다.
--
--   바뀌는 곳 3군데:
--     1) deals.current_stage        (현재 단계가 '패스'인 딜)
--     2) deals.final_result         (최종 결과가 '패스'인 딜)
--     3) deal_stage_history.stage   (단계 이력에 '패스'로 남아있던 기록 —
--        진행경과·주간보고 화면에 과거 이력으로 계속 표시되므로 함께 바꿉니다)
--
--   pass_reason · pass_reason_note 등 컬럼 이름 자체는 바꾸지 않습니다
--   (내부 식별자일 뿐 화면에는 안 보입니다. 값은 자산군 이름처럼 고정된
--   분류가 아니라 자유 입력이라 바꿀 내용도 없습니다).
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다
-- ('패스'로 남아있는 행이 이미 없으면 UPDATE가 그냥 0건 처리됩니다).
-- ================================================================

-- 1) 허용값 제약을 먼저 풉니다 (새 이름이 아직 허용 목록에 없어서,
--    풀어두지 않으면 아래 UPDATE가 제약 위반으로 실패합니다)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_current_stage;
ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_final_result;

-- 2) 기존 데이터의 값을 바꿉니다
UPDATE deals SET current_stage = '드랍' WHERE current_stage = '패스';
UPDATE deals SET final_result  = '드랍' WHERE final_result  = '패스';
UPDATE deal_stage_history SET stage = '드랍' WHERE stage = '패스';

-- 3) 허용값 제약을 새 이름으로 다시 겁니다
ALTER TABLE deals
  ADD CONSTRAINT chk_current_stage
    CHECK (current_stage IN ('접수','1차검토','심층검토','IC','투자확정','드랍')),
  ADD CONSTRAINT chk_final_result
    CHECK (final_result IN ('투자','드랍','보류') OR final_result IS NULL);

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- 아래 둘 다 '패스'가 0건, '드랍'이 기존 건수만큼 나오면 정상적으로 바뀐 것입니다.
-- SELECT current_stage, COUNT(*) FROM deals GROUP BY current_stage ORDER BY current_stage;
-- SELECT final_result, COUNT(*) FROM deals GROUP BY final_result ORDER BY final_result;
-- SELECT stage, COUNT(*) FROM deal_stage_history GROUP BY stage ORDER BY stage;
