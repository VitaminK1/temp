[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null
Write-Host "Terminal encoding set to UTF-8. Launching Electron..."
npx electron .
