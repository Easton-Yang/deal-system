-- ================================================================
-- 첨부파일 Storage 버킷 생성 (Self-hosted Supabase 전용)
-- 01_schema.sql 실행 후 SQL Editor(Studio)에서 실행
-- ================================================================

-- 비공개 버킷 'deal-files' (50MB 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('deal-files', 'deal-files', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 개발 단계: 인증/익명 사용자 모두 업로드·조회·삭제 허용
-- ※ 운영 전 사내 인증 연동 후 'authenticated' 로 제한할 것
CREATE POLICY "deal_files_select" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'deal-files');

CREATE POLICY "deal_files_insert" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'deal-files');

CREATE POLICY "deal_files_delete" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'deal-files');
