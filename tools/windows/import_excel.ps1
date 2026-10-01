param([string]$Xlsx, [string]$JsOut, [string]$SqlOut)
$ErrorActionPreference = 'Stop'

$STAGE_MAP = @('접수','1차검토','심층검토','IC','투자확정')   # 엑셀 (1)~(5)
$ASSETS = @('PE/VC','부동산','인프라','사모크레딧','상장주식','메자닌/비상장','공모주','원화채권','해외채권','기타')
$IMPORT_BY = '엑셀이관'

function JsStr($s) { if ($null -eq $s) { 'null' } else { '"' + ($s -replace '\\','\\' -replace '"','\"') + '"' } }
function SqlStr($s) { if ($null -eq $s -or $s -eq '') { 'NULL' } else { "'" + ($s -replace "'","''") + "'" } }

$xl = New-Object -ComObject Excel.Application; $xl.Visible = $false; $xl.DisplayAlerts = $false
$deals = New-Object System.Collections.Generic.List[object]
$warn  = New-Object System.Collections.Generic.List[string]
try {
  $wb = $xl.Workbooks.Open($Xlsx, 0, $true)
  foreach ($sheet in '2026.1Q','2026.2Q') {
    $ws = $wb.Worksheets.Item($sheet)
    $last = $ws.UsedRange.Row + $ws.UsedRange.Rows.Count - 1
    for ($r = 2; $r -le $last; $r++) {
      $title = ($ws.Cells.Item($r,5).Text -replace '\s*[\r\n]+\s*',' ').Trim()
      if (-not $title) { continue }
      $date = $ws.Cells.Item($r,2).Text.Trim()
      if ($date -notmatch '^\d{4}-\d{2}-\d{2}$') {
        $v = $ws.Cells.Item($r,2).Value2
        if ($v -is [double]) { $date = [DateTime]::FromOADate($v).ToString('yyyy-MM-dd') } else { $warn.Add("$sheet R$r 날짜 인식 불가: '$date'"); continue }
      }
      $sub = $ws.Cells.Item($r,4).Text.Trim()
      if ($ASSETS -notcontains $sub) { $warn.Add("$sheet R$r 세부유형 '$sub' → 기타"); $sub = '기타' }
      $n = 0; for ($c = 7; $c -le 11; $c++) { if ($ws.Cells.Item($r,$c).Text.Trim()) { $n = $c - 6 } }
      if ($n -eq 0) { $n = 1 }
      $deals.Add([pscustomobject]@{
        id = [guid]::NewGuid().ToString(); sheet = $sheet; row = $r
        deal_name = $title; intake_date = $date; asset_class = $sub
        introducer_gp = ($ws.Cells.Item($r,6).Text -replace '\s*[\r\n]+\s*',' ').Trim()
        stages = $n; current_stage = $STAGE_MAP[$n-1]
        final_result = $(if ($n -eq 5) { '투자' } else { $null })
      })
    }
  }
} finally { if ($wb) { $wb.Close($false) }; $xl.Quit(); [Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null }

# ── seed-data.js ─────────────────────────────────────────────
$js = New-Object System.Text.StringBuilder
[void]$js.AppendLine('// ================================================================')
[void]$js.AppendLine('// 초기 딜 데이터 (데모 모드용)')
[void]$js.AppendLine('// 출처: 포트폴리오현황보고_딜 접수목록 List 26.2Q.xlsx — 2026.1Q, 2026.2Q 시트')
[void]$js.AppendLine("// 이관일: $(Get-Date -Format 'yyyy-MM-dd')  |  $($deals.Count)건")
[void]$js.AppendLine('// ※ 엑셀에 없는 항목: 담당자(미배정), 인입경로(기타), 딜 규모, 단계별 진행일자')
[void]$js.AppendLine('// ================================================================')
[void]$js.AppendLine('const DEMO_DEALS_SEED = [')
foreach ($d in $deals) {
  $ts = "$($d.intake_date)T00:00:00Z"
  [void]$js.AppendLine(('  {{id:{0},deal_name:{1},intake_channel:"기타",intake_date:"{2}",asset_class:{3},assigned_to:"미배정",deal_size:null,introducer_gp:{4},current_stage:"{5}",first_opinion:null,final_result:{6},created_at:"{7}",updated_at:"{7}"}},' -f `
    (JsStr $d.id), (JsStr $d.deal_name), $d.intake_date, (JsStr $d.asset_class), (JsStr $d.introducer_gp), $d.current_stage, (JsStr $d.final_result), $ts))
}
[void]$js.AppendLine('];')
[void]$js.AppendLine('')
[void]$js.AppendLine('const DEMO_NOTES_SEED = [];')
[void]$js.AppendLine('')
[void]$js.AppendLine('// 엑셀에는 단계별 날짜가 없어, 도달한 단계를 접수일 기준으로 순서대로 기록 (1분 간격)')
[void]$js.AppendLine('const DEMO_STAGE_HISTORY_SEED = [')
$hid = 0
foreach ($d in $deals) {
  for ($k = 0; $k -lt $d.stages; $k++) {
    $hid++
    $t = ([DateTime]::ParseExact($d.intake_date,'yyyy-MM-dd',$null)).AddMinutes($k).ToString("yyyy-MM-ddTHH:mm:00Z")
    [void]$js.AppendLine(('  {{id:"h{0}",deal_id:"{1}",stage:"{2}",changed_by:"{3}",changed_at:"{4}"}},' -f $hid, $d.id, $STAGE_MAP[$k], $IMPORT_BY, $t))
  }
}
[void]$js.AppendLine('];')
[IO.File]::WriteAllText($JsOut, $js.ToString(), (New-Object Text.UTF8Encoding $false))

# ── 03_initial_data.sql ──────────────────────────────────────
$sql = New-Object System.Text.StringBuilder
[void]$sql.AppendLine('-- ================================================================')
[void]$sql.AppendLine('-- 초기 데이터 이관: 딜 접수목록 2026.1Q · 2026.2Q')
[void]$sql.AppendLine('-- 출처: 포트폴리오현황보고_딜 접수목록 List 26.2Q.xlsx')
[void]$sql.AppendLine("-- 건수: 딜 $($deals.Count)건 / 단계이력 ${hid}건  |  01_schema.sql 실행 후 1회 실행")
[void]$sql.AppendLine('-- 엑셀 단계 매핑: (1)제안접수=접수 (2)초기검토=1차검토 (3)상세검토=심층검토')
[void]$sql.AppendLine('--                 (4)투심위상정=IC (5)투자집행=투자확정(최종결과=투자)')
[void]$sql.AppendLine('-- 엑셀에 없는 항목: 담당자=미배정, 인입경로=기타, 딜 규모=NULL')
[void]$sql.AppendLine('-- ================================================================')
[void]$sql.AppendLine('BEGIN;')
[void]$sql.AppendLine('')
[void]$sql.AppendLine('INSERT INTO deals (id, deal_name, intake_channel, intake_date, asset_class, assigned_to, deal_size, introducer_gp, current_stage, final_result, created_at, updated_at) VALUES')
$rows = foreach ($d in $deals) {
  "  ('$($d.id)', $(SqlStr $d.deal_name), '기타', '$($d.intake_date)', $(SqlStr $d.asset_class), '미배정', NULL, $(SqlStr $d.introducer_gp), '$($d.current_stage)', $(SqlStr $d.final_result), '$($d.intake_date) 09:00+09', '$($d.intake_date) 09:00+09')"
}
[void]$sql.AppendLine(($rows -join ",`r`n") + ';')
[void]$sql.AppendLine('')
[void]$sql.AppendLine('INSERT INTO deal_stage_history (deal_id, stage, changed_by, changed_at) VALUES')
$hrows = foreach ($d in $deals) { for ($k = 0; $k -lt $d.stages; $k++) {
  "  ('$($d.id)', '$($STAGE_MAP[$k])', '$IMPORT_BY', '$($d.intake_date) 09:0$k+09')" } }
[void]$sql.AppendLine(($hrows -join ",`r`n") + ';')
[void]$sql.AppendLine('')
[void]$sql.AppendLine('COMMIT;')
[IO.File]::WriteAllText($SqlOut, $sql.ToString(), (New-Object Text.UTF8Encoding $false))

# ── 요약 ─────────────────────────────────────────────────────
"딜: $($deals.Count)건  (1Q $(@($deals | ? sheet -eq '2026.1Q').Count) / 2Q $(@($deals | ? sheet -eq '2026.2Q').Count))  단계이력: ${hid}건"
"단계별:";   $deals | Group-Object current_stage | Sort-Object { $STAGE_MAP.IndexOf($_.Name) } | % { "  $($_.Name): $($_.Count)" }
"자산군별:"; $deals | Group-Object asset_class | Sort-Object Count -Descending | % { "  $($_.Name): $($_.Count)" }
"경고:"; if ($warn.Count) { $warn } else { '  없음' }
