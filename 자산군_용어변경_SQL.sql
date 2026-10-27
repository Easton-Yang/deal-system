-- ================================================================
-- 자산군 명칭 변경 — 'PE/VC' → '기업 Equity', '사모크레딧' → '기업 Debt'
-- 2026-10-27  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   자산군 10종 분류 중 이름 2개만 바뀝니다. 분류 자체(10종)와 순서는
--   그대로입니다.
--     PE/VC    → 기업 Equity
--     사모크레딧 → 기업 Debt
--
--   기존 딜 데이터(지금까지 접수된 전부)도 이 SQL이 함께 바꿔줍니다.
--   예를 들어 자산군이 'PE/VC'로 저장된 딜은 전부 '기업 Equity'로
--   바뀝니다. 딜명·GP명 등 다른 글자에 "PE/VC"나 "사모크레딧"이라는
--   단어가 들어있어도(예: 펀드 이름) 그건 건드리지 않습니다 — 오직
--   '자산군' 칸의 값만 바뀝니다.
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다
-- (이미 '기업 Equity'/'기업 Debt'로 바뀐 행은 WHERE 조건에 안 걸려
-- 두 번째 실행에서는 그냥 건너뜁니다).
-- ================================================================

-- 1) 허용값 제약을 먼저 풉니다 (새 이름이 아직 허용 목록에 없어서,
--    풀어두지 않으면 아래 UPDATE가 제약 위반으로 실패합니다)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_asset_class;

-- 2) 기존 데이터의 자산군 값을 바꿉니다
UPDATE deals SET asset_class = '기업 Equity' WHERE asset_class = 'PE/VC';
UPDATE deals SET asset_class = '기업 Debt'   WHERE asset_class = '사모크레딧';

-- 3) 허용값 제약을 새 이름으로 다시 겁니다
ALTER TABLE deals
  ADD CONSTRAINT chk_asset_class
    CHECK (asset_class IN ('기업 Equity','부동산','인프라','기업 Debt',
                           '상장주식','메자닌/비상장','공모주',
                           '원화채권','해외채권','기타'));

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- 아래를 실행해서 'PE/VC'·'사모크레딧'이 0건, '기업 Equity'·'기업 Debt'가
-- 기존 건수만큼 나오면 정상적으로 바뀐 것입니다.
-- SELECT asset_class, COUNT(*) FROM deals GROUP BY asset_class ORDER BY asset_class;
