$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

# Launch emulator detached
Start-Process -FilePath "$env:ANDROID_HOME\emulator\emulator.exe" `
  -ArgumentList @('-avd','sahatakip','-no-snapshot-load','-no-boot-anim','-gpu','auto') `
  -WindowStyle Minimized

Write-Host "Emulator launching... waiting for device"
& adb.exe wait-for-device
Write-Host "ADB connected. Waiting for boot completion..."
$timeout = 180
$elapsed = 0
while ($elapsed -lt $timeout) {
  $boot = & adb.exe shell getprop sys.boot_completed 2>$null
  if ($boot -match '1') { Write-Host "BOOT COMPLETE in $elapsed sec"; break }
  Start-Sleep -Seconds 5
  $elapsed += 5
}
& adb.exe devices
