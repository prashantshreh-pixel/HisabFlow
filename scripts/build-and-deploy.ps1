# HisabFlow Build & Deploy Script
# Builds Next.js static export inside frontend/ and syncs out/ into ASP.NET Core wwwroot

$ErrorActionPreference = "Stop"

$RootDir = Resolve-Path "$PSScriptRoot/.."
$FrontendDir = "$RootDir/frontend"
$OutDir = "$FrontendDir/out"
$WwwRootDir = "$RootDir/backend/src/HisabFlow.Api/wwwroot"

Write-Host "==> 1. Building Next.js Static Export in frontend/..." -ForegroundColor Cyan
Push-Location $FrontendDir
try {
    npm run build
} finally {
    Pop-Location
}

if (-not (Test-Path $OutDir)) {
    throw "Export failed: 'frontend/out' directory was not created."
}

Write-Host "==> 2. Syncing static bundle to ASP.NET Core wwwroot..." -ForegroundColor Cyan
if (Test-Path $WwwRootDir) {
    Get-ChildItem -Path $WwwRootDir -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $WwwRootDir -Force | Out-Null
}

Get-ChildItem -Path $OutDir -Force | Copy-Item -Destination $WwwRootDir -Recurse -Force

Write-Host "==> 3. Building ASP.NET Core Solution..." -ForegroundColor Cyan
dotnet build "$RootDir/backend/HisabFlow.sln" --configuration Release

Write-Host "==> Success! HisabFlow static frontend is wrapped inside ASP.NET Core wwwroot." -ForegroundColor Green
Write-Host "    Run backend with: dotnet run --project backend/src/HisabFlow.Api" -ForegroundColor Yellow
Write-Host "    Open browser at:  http://localhost:5200" -ForegroundColor Yellow
