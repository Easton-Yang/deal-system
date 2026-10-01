// ================================================================
// 설정 파일 - 여기만 수정하면 됩니다
// ================================================================

// [1단계] 데모 모드 (지금 당장 쓸 수 있음, 데이터는 이 브라우저에만 저장)
// Supabase 연결 후 false로 바꾸세요
const DEMO_MODE = false;

// [2단계] Supabase 설정 (팀 공유용, DEMO_MODE = false 일 때 사용)
// supabase.com 가입 후 Settings > API 에서 복사
const SUPABASE_URL  = 'https://oclsbgqfmsauyawawtba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbHNiZ3FmbXNhdXlhd2F3dGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTM5NjYsImV4cCI6MjEwNjI4OTk2Nn0.acFEaod9SAodL30hRow4YvelgtstCkehF0LodeZkKVE';

// 팀원 목록 (원하는 이름으로 수정)
const TEAM_MEMBERS = ['sunghoon.yu', 'dongmin.yang', 'seungjun.shin', 'minji.kim'];

// 현재 사용자 이름 (각 팀원이 자신의 이름으로 변경)
const CURRENT_USER = 'sunghoon.yu';

// 관리자 비밀번호 (로그인 페이지의 관리 탭 보호용)
const ADMIN_PASSWORD = 'admin123';
