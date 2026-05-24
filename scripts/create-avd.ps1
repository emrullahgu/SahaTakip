$ErrorActionPreference = 'Continue'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"

Write-Host "=== Creating AVD ==="
"no" | & avdmanager.bat create avd -n sahatakip -k "system-images;android-34;google_apis_playstore;x86_64" --force 2>&1 | Select-Object -Last 8

Write-Host "=== Listing AVDs ==="
& emulator.exe -list-avds 2>&1
