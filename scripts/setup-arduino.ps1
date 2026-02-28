$binDir = Join-Path $PSScriptRoot "..\bin"
if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir }

$zipPath = Join-Path $binDir "arduino-cli.zip"
$cliPath = Join-Path $binDir "arduino-cli.exe"

if (!(Test-Path $cliPath)) {
    Write-Host "Downloading arduino-cli..."
    Invoke-WebRequest -Uri "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip" -OutFile $zipPath -UseBasicParsing

    Write-Host "Extracting..."
    Expand-Archive -Path $zipPath -DestinationPath $binDir -Force
    Remove-Item $zipPath
} else {
    Write-Host "arduino-cli already found, skipping download."
}

Write-Host "Initializing arduino-cli..."
& $cliPath config init --force

Write-Host "Adding ESP32 support..."
& $cliPath config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
& $cliPath core update-index

Write-Host "Installing ESP32 Core (this may take a few minutes)..."
& $cliPath core install esp32:esp32

Write-Host "Installing Arduino AVR Core (Uno, Nano, Mega)..."
& $cliPath core install arduino:avr

Write-Host "`nSetup complete! Compiler is ready at: $cliPath"
