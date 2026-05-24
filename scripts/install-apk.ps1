$ErrorActionPreference = 'Stop'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:Path"

$apkUrl = 'https://expo.dev/artifacts/eas/XXcVaHLPGdYVVvaJ66y9d.apk'
$apkPath = "$env:TEMP\sahatakip-build5.apk"

Write-Host "=== Downloading APK ==="
Invoke-WebRequest -Uri $apkUrl -OutFile $apkPath -UseBasicParsing
Write-Host "Saved: $apkPath ($((Get-Item $apkPath).Length / 1MB) MB)"

Write-Host "=== Checking device ==="
& adb.exe devices

Write-Host "=== Uninstall previous (if any) ==="
& adb.exe uninstall com.SahaTakip.sahatakip 2>&1 | Out-Null

Write-Host "=== Installing ==="
& adb.exe install -r $apkPath

Write-Host "=== Clearing logcat buffer ==="
& adb.exe logcat -c

Write-Host "=== Launching app ==="
& adb.exe shell monkey -p com.SahaTakip.sahatakip -c android.intent.category.LAUNCHER 1
