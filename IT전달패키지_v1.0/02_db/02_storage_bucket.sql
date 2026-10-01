-- ================================================================
-- 첨부파일 Storage 버킷 생성 (Self-hosted Supabase 전용)
-- 01_schema.sql 실행 후 SQL Editor(Studio)에서 실행
-- ================================================================
-- [2026-10-01 변경] 이전 버전은 anon(로그인하지 않은 요청)에게도
-- 업로드·조회·삭제를 허용하고, "운영 전 authenticated 로 제한할 것"
-- 이라는 주석만 달아 두었습니다. 주석은 실행되지 않습니다.
-- 그래서 처음부터 로그인 사용자 전용으로 바꿨습니다.
-- ================================================================

-- 비공개 버킷 'deal-files' (50MB 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('deal-files', 'deal-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 이미 만들어진 버킷이 공개 상태라면 비공개로 되돌립니다
UPDATE storage.buckets SET public = false WHERE id = 'deal-files';

-- 'deal-files' 버킷에 걸린 기존 정책을 전부 제거합니다.
-- 이름을 하드코딩하면 다른 이름의 느슨한 정책이 살아남습니다.
-- (다른 버킷의 정책은 건드리지 않도록, 정책 내용에 'deal-files' 가
--  들어 있는 것만 골라냅니다.)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') LIKE '%deal-files%'
        OR coalesce(with_check, '') LIKE '%deal-files%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    RAISE NOTICE '기존 Storage 정책 제거: %', r.policyname;
  END LOOP;
END $$;

-- 로그인한 사용자(authenticated)만 조회·업로드·삭제
CREATE POLICY "deal_files_select_auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'deal-files');

CREATE POLICY "deal_files_insert_auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'deal-files');

CREATE POLICY "deal_files_delete_auth" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'deal-files');

-- ================================================================
-- 확인용 (선택)
-- ================================================================
--   SELECT id, public FROM storage.buckets WHERE id = 'deal-files';
--     → public 이 false 여야 정상
--
--   SELECT policyname, roles, cmd FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--   ORDER BY policyname;
--     → roles 에 anon 이 없어야 정상
-- ================================================================
