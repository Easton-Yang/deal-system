-- ================================================================
--  딜 관리 시스템 · 보안 설정 SQL
-- ================================================================
--  이 파일이 하는 일 (딱 세 가지입니다)
--    1) 평문 비밀번호가 들어 있던 users 테이블을 없앱니다.
--    2) 딜 데이터를 '로그인한 사람만' 볼 수 있게 잠급니다.
--    3) 첨부파일도 같은 기준으로 잠급니다.
--
--  실행 방법
--    1. supabase.com 로그인 → 이 프로젝트 선택
--    2. 왼쪽 메뉴 맨 아래 'SQL Editor' 클릭
--    3. 'New query' 클릭
--    4. 이 파일 내용을 전부 복사해서 붙여넣기
--    5. 오른쪽 아래 'Run' 클릭 (Success 라고 나오면 끝)
--
--  순서 주의
--    이 SQL을 먼저 실행하면, 계정을 만들기 전까지는 아무도 데이터를
--    볼 수 없게 됩니다. 그러니
--      (가) Authentication > Users 에서 팀원 4명 계정 먼저 만들기
--      (나) 그 다음에 이 SQL 실행
--    순서로 하세요.
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. 평문 비밀번호가 담긴 users 테이블 제거
-- ────────────────────────────────────────────────────────────────
-- 이 테이블의 password_hash 칸에는 이름과 달리 암호화되지 않은
-- 생 비밀번호가 그대로 들어 있었고, 로그인 없이 누구나 읽고
-- 고칠 수 있는 상태였습니다.
--
-- 이제 로그인은 Supabase Auth(auth.users)가 담당하고, 비밀번호는
-- 되돌릴 수 없는 해시로 보관됩니다. 그래서 이 테이블은 필요 없습니다.
--
-- 딜 데이터의 담당자·작성자는 이 테이블을 참조하지 않고 그냥 이름
-- (TEXT)으로 저장돼 있으므로, 지워도 딜 247건은 아무 영향이 없습니다.

-- 혹시 나중에 확인할 일이 있을까 싶어도 남기지 마세요.
-- 유출된 비밀번호를 데이터베이스에 두는 것 자체가 위험입니다.
DROP TABLE IF EXISTS public.users CASCADE;


-- ────────────────────────────────────────────────────────────────
-- 2. 딜 데이터를 '로그인한 사람만' 접근 가능하게 잠금
-- ────────────────────────────────────────────────────────────────
-- RLS(Row Level Security, 행 수준 보안)를 켜면, 조건에 맞는 요청만
-- 데이터를 받습니다. 지금까지는 꺼져 있어서 로그인 없이도 전부
-- 읽고 쓸 수 있었습니다.
--
-- 여기서 쓰는 두 이름의 뜻
--   anon          = 로그인하지 않은 사람 (주소만 알면 누구나)
--   authenticated = 로그인에 성공한 사람 (팀원 4명)

ALTER TABLE public.deals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_files          ENABLE ROW LEVEL SECURITY;

-- 예전에 만들어 둔 정책이 남아 있으면 지웁니다
-- (이름이 같은 정책은 두 번 만들 수 없어서, 다시 실행해도 되게 해둡니다)
DROP POLICY IF EXISTS "authenticated_select_deals"    ON public.deals;
DROP POLICY IF EXISTS "authenticated_insert_deals"    ON public.deals;
DROP POLICY IF EXISTS "authenticated_update_deals"    ON public.deals;
DROP POLICY IF EXISTS "authenticated_delete_deals"    ON public.deals;
DROP POLICY IF EXISTS "authenticated_select_history"  ON public.deal_stage_history;
DROP POLICY IF EXISTS "authenticated_insert_history"  ON public.deal_stage_history;
DROP POLICY IF EXISTS "authenticated_select_notes"    ON public.deal_notes;
DROP POLICY IF EXISTS "authenticated_insert_notes"    ON public.deal_notes;
DROP POLICY IF EXISTS "authenticated_select_files"    ON public.deal_files;
DROP POLICY IF EXISTS "authenticated_insert_files"    ON public.deal_files;

-- 새 정책: 로그인한 사람(authenticated)에게만 허용
-- deals
CREATE POLICY "deals_select_auth" ON public.deals
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert_auth" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deals_update_auth" ON public.deals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "deals_delete_auth" ON public.deals
  FOR DELETE TO authenticated USING (true);

-- deal_stage_history (단계 이력: 기록이므로 수정·삭제는 막습니다)
CREATE POLICY "history_select_auth" ON public.deal_stage_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert_auth" ON public.deal_stage_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- deal_notes (메모)
CREATE POLICY "notes_select_auth" ON public.deal_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert_auth" ON public.deal_notes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notes_delete_auth" ON public.deal_notes
  FOR DELETE TO authenticated USING (true);

-- deal_files (첨부파일 목록)
CREATE POLICY "files_select_auth" ON public.deal_files
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert_auth" ON public.deal_files
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "files_delete_auth" ON public.deal_files
  FOR DELETE TO authenticated USING (true);

-- 로그인하지 않은 사람(anon)의 권한을 확실히 걷어냅니다.
-- RLS 정책만으로도 막히지만, 두 겹으로 막아둡니다.
REVOKE ALL ON public.deals              FROM anon;
REVOKE ALL ON public.deal_stage_history FROM anon;
REVOKE ALL ON public.deal_notes         FROM anon;
REVOKE ALL ON public.deal_files         FROM anon;

-- 로그인한 사람에게는 필요한 권한을 명시적으로 줍니다.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals              TO authenticated;
GRANT SELECT, INSERT                 ON public.deal_stage_history TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.deal_notes         TO authenticated;
GRANT SELECT, INSERT, DELETE         ON public.deal_files         TO authenticated;


-- ────────────────────────────────────────────────────────────────
-- 3. 첨부파일(Storage) 잠금
-- ────────────────────────────────────────────────────────────────
-- 'deal-files' 버킷도 지금은 로그인하지 않은 사람에게 열려 있습니다.

-- 버킷을 비공개로 (이미 비공개면 그대로)
UPDATE storage.buckets SET public = false WHERE id = 'deal-files';

DROP POLICY IF EXISTS "deal_files_select" ON storage.objects;
DROP POLICY IF EXISTS "deal_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "deal_files_delete" ON storage.objects;

CREATE POLICY "deal_files_select_auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'deal-files');
CREATE POLICY "deal_files_insert_auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'deal-files');
CREATE POLICY "deal_files_delete_auth" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'deal-files');


-- ================================================================
--  확인용 (아래는 선택 사항입니다)
-- ================================================================
-- 실행 후 아래 쿼리를 따로 돌려보면 잠금이 걸렸는지 볼 수 있습니다.
-- rls_enabled 칸이 네 줄 모두 true 여야 정상입니다.
--
--   SELECT tablename, rowsecurity AS rls_enabled
--   FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename IN ('deals','deal_stage_history','deal_notes','deal_files')
--   ORDER BY tablename;
--
-- users 테이블이 지워졌는지 확인 (0 이 나와야 정상):
--
--   SELECT count(*) FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'users';
--
-- 정책 목록 확인:
--
--   SELECT tablename, policyname, roles, cmd
--   FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
-- ================================================================


-- ================================================================
--  이 SQL이 하지 않는 일 (사람이 직접 해야 하는 일)
-- ================================================================
--  1) 팀원 계정 만들기
--     Authentication > Users > 'Add user' > 'Create new user'
--     - Email: 회사 메일 주소
--     - Password: 임시 비밀번호
--     - 'Auto Confirm User' 를 켜야 메일 인증 없이 바로 로그인됩니다.
--
--  2) 유출된 비밀번호 폐기
--     기존 비밀번호(1234 등)는 이미 공개됐으므로 다시 쓰면 안 됩니다.
--     특히 같은 비밀번호를 메일·은행·회사 계정에 쓰고 있었다면
--     그쪽을 먼저 바꾸세요.
--
--  3) GitHub 저장소 비공개 전환
--     저장소가 공개 상태였다면, 과거 커밋에 남은 내용은 비공개로
--     바꿔도 이미 복제됐을 수 있습니다. 2)번을 먼저 하세요.
--
--  4) 회원가입 차단 (권장)
--     Authentication > Providers > Email 에서
--     'Enable email signup' 을 꺼두면, 외부인이 스스로 계정을
--     만들어 로그인하는 것을 막을 수 있습니다.
--     (계정은 관리자가 위 1)번 방법으로만 추가)
-- ================================================================
