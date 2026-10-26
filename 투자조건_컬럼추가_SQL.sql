-- ================================================================
-- "투자조건 구조화" 기능 추가 — deals 테이블에 컬럼 7개 추가
-- 2026-10  |  자산운용팀
--
-- 사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--
-- 무엇이 바뀌나요
--   딜마다 투자수단(대출/사채/보통주/우선주/CB/펀드지분/기타)과, 통화·당사
--   검토금액·만기·기대수익률·핵심 투자논거·주요 위험을 기록할 수 있게
--   됩니다. 딜 간 비교와 사전 선별에 쓰기 위함입니다.
--
--   화면에는 접수 단계에서는 안 보이고 1차검토 단계부터 나타납니다
--   (자산군 10종 분류 자체는 바꾸지 않았습니다 — 기존 247건 재분류 불필요).
--
--   기존 딜은 전부 빈 값(NULL)으로 시작합니다. 과거 딜까지 소급해서
--   채워 넣을 필요는 없습니다.
--
-- 실행해도 안전합니다: 이미 실행했어도 다시 실행하면 오류 없이 넘어갑니다.
-- ================================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS investment_vehicle TEXT,  -- 투자수단: 대출/사채/보통주/우선주/CB/펀드지분/기타
  ADD COLUMN IF NOT EXISTS currency           TEXT,  -- 통화: KRW/USD/EUR/JPY/기타
  ADD COLUMN IF NOT EXISTS review_amount      BIGINT, -- 당사 검토금액
  ADD COLUMN IF NOT EXISTS maturity_term      TEXT,  -- 만기 (자유 입력, 예: "3년", "2029.12")
  ADD COLUMN IF NOT EXISTS expected_return    TEXT,  -- 기대수익률 (자유 입력, 예: "연 8%", "IRR 15%")
  ADD COLUMN IF NOT EXISTS investment_thesis  TEXT,  -- 핵심 투자논거
  ADD COLUMN IF NOT EXISTS key_risks          TEXT;  -- 주요 위험

COMMENT ON COLUMN deals.investment_vehicle IS '투자수단. 2026-10 추가';
COMMENT ON COLUMN deals.currency           IS '통화. 2026-10 추가';
COMMENT ON COLUMN deals.review_amount      IS '당사 검토금액(원 단위). 2026-10 추가';
COMMENT ON COLUMN deals.maturity_term      IS '만기(자유 입력). 2026-10 추가';
COMMENT ON COLUMN deals.expected_return    IS '기대수익률(자유 입력). 2026-10 추가';
COMMENT ON COLUMN deals.investment_thesis  IS '핵심 투자논거. 2026-10 추가';
COMMENT ON COLUMN deals.key_risks          IS '주요 위험. 2026-10 추가';

-- 허용값 제약 (다시 실행해도 오류가 나지 않도록 먼저 제거 후 추가)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_investment_vehicle;
ALTER TABLE deals
  ADD CONSTRAINT chk_investment_vehicle
    CHECK (investment_vehicle IN ('대출','사채','보통주','우선주','CB','펀드지분','기타') OR investment_vehicle IS NULL);

ALTER TABLE deals DROP CONSTRAINT IF EXISTS chk_currency;
ALTER TABLE deals
  ADD CONSTRAINT chk_currency
    CHECK (currency IN ('KRW','USD','EUR','JPY','기타') OR currency IS NULL);

-- ── 확인 쿼리 ───────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'deals' AND column_name IN
--   ('investment_vehicle','currency','review_amount','maturity_term',
--    'expected_return','investment_thesis','key_risks');
