$bad = @()
Get-ChildItem src/screens/*.tsx,src/components/*.tsx | ForEach-Object {
  $c = Get-Content $_.FullName -Raw
  if ($c -match '<FlatList\b' -or $c -match '\bFlatList\.') {
    $hasImport = $false
    foreach ($m in [regex]::Matches($c, "(?s)import\s*\{([^}]*)\}\s*from\s*['""]react-native['""]")) {
      if ($m.Groups[1].Value -match '\bFlatList\b') { $hasImport = $true; break }
    }
    if (-not $hasImport) { $bad += $_.Name }
  }
}
Write-Host "Missing FlatList import: $($bad.Count)"
$bad | ForEach-Object { Write-Host "  $_" }
