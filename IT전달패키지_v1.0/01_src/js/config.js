// ================================================================
// 설정 파일 - 내부 VDI 배포용 (IT팀 작성 항목: ★)
// ================================================================

// 데모 모드: true = 브라우저 localStorage에만 저장 (화면 동작 확인용)
//           false = 내부 DB 서버 사용 (운영)
const DEMO_MODE = true;   // ★ DB 연결 완료 후 false 로 변경

// ★ 내부 Supabase(Self-hosted) API 게이트웨이 주소 — VDI에서 접근 가능한 내부 주소
//   예) http://10.x.x.x:8000  또는  https://dealsys-api.사내도메인
const SUPABASE_URL  = 'http://INTERNAL_API_HOST:8000';

// ★ Self-hosted Supabase 의 .env 에 설정한 ANON_KEY
const SUPABASE_ANON_KEY = 'INTERNAL_ANON_KEY';

// 팀원 목록 (담당자 선택 목록)
const TEAM_MEMBERS = ['유성훈', '양동민', '신승준', '김민지'];

// 현재 사용자 이름
// ※ 임시 방식: 사내 인증(SSO/AD) 연동 후 로그인 사용자 이름으로 대체 필요
//   → 04_docs/개발_인수인계_노트.md "3-1. 사용자 인증" 참고
const CURRENT_USER = '유성훈';
