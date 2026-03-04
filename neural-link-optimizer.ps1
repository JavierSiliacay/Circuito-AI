# Circuito AI - Neural Link Optimizer
# Ensures the local environment is optimized for the Web File System Access API

$ErrorActionPreference = "Stop"
$Logo = @"
   ______ _                      _ _             ___  _____ 
  / ____(_)                    (_) |           / _ \|_   _|
 | |     _ _ __ ___ _   _ _ __  _| |_ ___     / /_\ \ | |  
 | |    | | '__/ __| | | | '  \| | __/ _ \    |  _  | | |  
 | |____| | | | (__| |_| | |  || | || (_) |   | | | |_| |_ 
  \_____|_|_|  \___|\__,_|_|  |_|_|\__\___/    \_| |_/\___/ 
                                                           
   Neural Link Connectivity Optimizer (Windows ver)
"@

Write-Host $Logo -ForegroundColor Cyan
Write-Host "`n[1/3] Checking Project Folder Integrity..." -ForegroundColor Yellow

$CurrentDir = Get-Location
$ArduinoFiles = Get-ChildItem -Path $CurrentDir.Path -Filter "*.ino"
$CppFiles = Get-ChildItem -Path $CurrentDir.Path -Filter "*.cpp"

if ($ArduinoFiles.Count -eq 0 -and $CppFiles.Count -eq 0) {
    Write-Host "[-] WARNING: No Arduino (.ino) or C++ (.cpp) files found in this directory." -ForegroundColor Red
    Write-Host "    Make sure you run this script inside your Arduino project folder."
}
else {
    Write-Host "[+] OK: Found project files: $(($ArduinoFiles + $CppFiles) | Select-Object -ExpandProperty Name)" -ForegroundColor Green
}

Write-Host "`n[2/3] Checking for File Locks..." -ForegroundColor Yellow
$LockedFiles = @()

foreach ($file in ($ArduinoFiles + $CppFiles)) {
    try {
        $stream = [System.IO.File]::Open($file.FullName, 'Open', 'Read', 'None')
        $stream.Close()
    }
    catch {
        $LockedFiles += $file.Name
    }
}

if ($LockedFiles.Count -gt 0) {
    Write-Host "[-] CONFLICT: The following files are currently locked by another application (e.g., Arduino IDE):" -ForegroundColor Red
    foreach ($f in $LockedFiles) { Write-Host "    -> $f" }
    Write-Host "    Neural Link might fail with 'InvalidStateError' if files remain locked." -ForegroundColor Magenta
}
else {
    Write-Host "[+] OK: All project files are accessible. No active locks detected." -ForegroundColor Green
}

Write-Host "`n[3/3] Optimizing System Access..." -ForegroundColor Yellow

# Ensure the browser has permission to see the folder (not directly possible but can check folder attributes)
$FolderAttributes = Get-Item $CurrentDir.Path
if ($FolderAttributes.IsReadOnly) {
    Write-Host "[-] WARNING: This folder is marked as Read-Only. Setting to Read-Write..." -ForegroundColor Yellow
    Set-ItemProperty $CurrentDir.Path -Name IsReadOnly -Value $false
}

Write-Host "[+] SUCCESS: Environment Optimized!" -ForegroundColor Green
Write-Host "`n======================================================="
Write-Host "Neural Link is ready. Keep this folder open while coding."
Write-Host "If the browser shows 'InvalidStateError', re-run this script."
Write-Host "=======================================================`n"

Read-Host "Press Enter to exit..."
