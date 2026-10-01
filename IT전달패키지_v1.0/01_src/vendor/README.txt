외부 라이브러리 폴더 (내부망은 CDN 접근 불가 → 로컬 사본 사용)

아래 구조로 파일이 있어야 화면이 정상 표시됩니다.
※ 2026-09-23 기준 아래 파일이 모두 포함되어 있습니다 (SHA256SUMS.txt 로 무결성 확인 가능).
  다시 받아야 할 때만 03_deploy\fetch-vendor.ps1 을 인터넷 가능한 PC에서 실행하세요.

vendor/
├─ bootstrap/bootstrap.min.css            Bootstrap 5.3.2   (MIT)
├─ bootstrap/bootstrap.bundle.min.js      Bootstrap 5.3.2   (MIT)
├─ chartjs/chart.umd.min.js               Chart.js 4.4.1    (MIT)  ※ 대시보드(index.html)만 사용
├─ supabase/supabase.js                   supabase-js 2.117.0 (MIT)
└─ fontawesome/
   ├─ css/all.min.css                     Font Awesome Free 6.5.0 (CSS: MIT / 폰트: OFL 1.1)
   └─ webfonts/fa-*.woff2, fa-*.ttf
