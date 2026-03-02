$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$FileBrowser = New-Object System.Windows.Forms.OpenFileDialog
$FileBrowser.Filter = "Arduino Sketch (*.ino)|*.ino|All Files (*.*)|*.*"
$FileBrowser.Title = "Select your Arduino Sketch"
$null = $FileBrowser.ShowDialog()
Write-Output $FileBrowser.FileName
