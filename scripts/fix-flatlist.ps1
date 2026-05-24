$files = @(
  'ExpensesScreen.tsx','GesProposalsScreen.tsx','MaterialsScreen.tsx',
  'NotificationsScreen.tsx','OsosReadingsScreen.tsx','PaymentsScreen.tsx',
  'ProductItemsScreen.tsx','ReportsScreen.tsx','ScheduledEmailsScreen.tsx',
  'SlaScreen.tsx','StockMovementsScreen.tsx','StockScreen.tsx',
  'TasksScreen.tsx','TransformerProposalsScreen.tsx','UsersAdminScreen.tsx',
  'VehiclesScreen.tsx','WarehousesScreen.tsx','WeeklyReportsScreen.tsx'
)
$fixed = @(); $skipped = @()
foreach ($name in $files) {
  $path = "src/screens/$name"
  $c = Get-Content $path -Raw
  $pattern = "(?s)(import\s*\{)([^}]*?)(\}\s*from\s*['""]react-native['""])"
  $m = [regex]::Match($c, $pattern)
  if (-not $m.Success) { $skipped += "$name (no RN import)"; continue }
  $inside = $m.Groups[2].Value
  if ($inside -match '\bFlatList\b') { $skipped += "$name (already has)"; continue }
  $trimmed = $inside.TrimEnd()
  if ($trimmed.EndsWith(',')) {
    $newInside = $trimmed + ' FlatList,' + "`n"
  } else {
    $newInside = $trimmed + ', FlatList' + "`n"
  }
  $newImport = $m.Groups[1].Value + $newInside + $m.Groups[3].Value
  $newC = $c.Substring(0, $m.Index) + $newImport + $c.Substring($m.Index + $m.Length)
  Set-Content -Path $path -Value $newC -NoNewline -Encoding UTF8
  $fixed += $name
}
Write-Host "FIXED ($($fixed.Count)):"
$fixed | ForEach-Object { Write-Host "  $_" }
Write-Host "SKIPPED ($($skipped.Count)):"
$skipped | ForEach-Object { Write-Host "  $_" }
