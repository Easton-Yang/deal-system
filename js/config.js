// ================================================================
// 설정 파일 - 여기만 수정하면 됩니다
// ================================================================

// [1단계] 데모 모드 (데이터는 이 브라우저에만 저장, 로그인 없이 사용)
// 팀과 공유해 쓸 때는 false 로 둡니다.
const DEMO_MODE = false;

// [2단계] Supabase 설정 (팀 공유용, DEMO_MODE = false 일 때 사용)
// supabase.com > Settings > API 에서 복사
// ※ anon key 는 브라우저에 공개되는 값이라 비밀이 아닙니다.
//    실제 보호는 Supabase 의 RLS(행 수준 보안)가 담당합니다.
//    반드시 '보안설정_SQL.sql' 을 실행해 두세요.
const SUPABASE_URL  = 'https://oclsbgqfmsauyawawtba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbHNiZ3FmbXNhdXlhd2F3dGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3MTM5NjYsImV4cCI6MjEwNjI4OTk2Nn0.acFEaod9SAodL30hRow4YvelgtstCkehF0LodeZkKVE';

// [3단계] 로그인 아이디로 쓸 회사 메일 도메인
// 예: 'preedlife.com' 으로 적어두면 로그인 화면에서 'dongmin.yang' 만 입력해도
//     'dongmin.yang@preedlife.com' 으로 로그인됩니다.
// 빈 문자열('')로 두면 로그인 화면에서 메일 주소를 전부 입력해야 합니다.
const LOGIN_EMAIL_DOMAIN = '';

// 팀원 목록 (딜 담당자 드롭다운에 쓰입니다)
const TEAM_MEMBERS = ['sunghoon.yu', 'dongmin.yang', 'seungjun.shin', 'minji.kim'];

// ※ CURRENT_USER 와 ADMIN_PASSWORD 는 삭제했습니다.
//   - CURRENT_USER: 파일만 고치면 남의 이름으로 기록이 남을 수 있었습니다.
//                   이제 '로그인한 사람'이 자동으로 기록됩니다.
//   - ADMIN_PASSWORD: 브라우저로 내려가는 파일에 적혀 있어 누구나 볼 수 있었습니다.
//                     관리 기능은 Supabase 로그인으로 보호됩니다.
