# Circuito AI - Autonomous Link Activator
# Instantly launches the bridge and optimizes the environment

$ErrorActionPreference = "Stop"
$Logo = @"
   ______ _                      _ _             ___  _____ 
  / ____(_)                    (_) |           / _ \|_   _|
 | |     _ _ __ ___ _   _ _ __  _| |_ ___     / /_\ \ | |  
 | |    | | '__/ __| | | | '  \| | __/ _ \    |  _  | | |  
 | |____| | | | (__| |_| | |  || | || (_) |   | | | |_| |_ 
  \_____|_|_|  \___|\__,_|_|  |_|_|\__\___/    \_| |_/\___/ 
                                                           
   Autonomous Link Auto-Activator (Autonomous Mode Helper)
"@

Write-Host $Logo -ForegroundColor Cyan
Write-Host "`n[1/2] Optimizing Environment..." -ForegroundColor Yellow

# Optimization logic from earlier
$CurrentDir = Get-Location
$FolderAttributes = Get-Item $CurrentDir.Path
if ($FolderAttributes.IsReadOnly) {
    Set-ItemProperty $CurrentDir.Path -Name IsReadOnly -Value $false
    Write-Host "[+] Folder permissions set to Read-Write." -ForegroundColor Green
} else {
    Write-Host "[+] Environment already optimized." -ForegroundColor Green
}

Write-Host "`n[2/2] Launching Autonomous Bridge Gateway..." -ForegroundColor Yellow
Write-Host "Please keep this window open while using Autonomous Mode.`n" -ForegroundColor Magenta

# Check if node_modules exist
if (-not (Test-Path "node_modules")) {
    Write-Host "[-] Error: node_modules not found. Running pnpm install first..." -ForegroundColor Yellow
    pnpm install
}

# Run the bridge
npm run bridge

Read-Host "`nBridge stopped. Press Enter to exit..."
