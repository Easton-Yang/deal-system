# ================================================================
# 외부 라이브러리 내려받기 (인터넷 가능한 PC에서 1회 실행)
# 실행 후 01_src\vendor 폴더째로 내부망 반입 → 웹서버 루트에 배치
#   powershell -ExecutionPolicy Bypass -File .\fetch-vendor.ps1
# ================================================================
$ErrorActionPreference = 'Stop'
$vendor = Join-Path $PSScriptRoot '..\01_src\vendor'

$files = [ordered]@{
  'bootstrap/bootstrap.min.css'        = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/css/bootstrap.min.css'
  'bootstrap/bootstrap.bundle.min.js'  = 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.2/js/bootstrap.bundle.min.js'
  'chartjs/chart.umd.min.js'           = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
  'supabase/supabase.js'               = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js'
  'fontawesome/css/all.min.css'        = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
}
# Font Awesome 폰트 (all.min.css 가 ../webfonts/ 경로로 참조)
foreach ($w in 'fa-solid-900','fa-regular-400','fa-brands-400','fa-v4compatibility') {
  foreach ($ext in 'woff2','ttf') {
    $files["fontawesome/webfonts/$w.$ext"] = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/webfonts/$w.$ext"
  }
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
foreach ($rel in $files.Keys) {
  $dest = Join-Path $vendor $rel
  New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
  Invoke-WebRequest -Uri $files[$rel] -OutFile $dest -UseBasicParsing
  '{0,-45} {1,8:N0} bytes' -f $rel, (Get-Item $dest).Length
}

# 반입 심사용 해시 목록
Get-ChildItem $vendor -Recurse -File |
  Get-FileHash -Algorithm SHA256 |
  ForEach-Object { '{0}  {1}' -f $_.Hash, $_.Path.Substring((Resolve-Path $vendor).Path.Length + 1) } |
  Set-Content (Join-Path $vendor 'SHA256SUMS.txt') -Encoding UTF8
'완료: vendor\SHA256SUMS.txt 생성'
