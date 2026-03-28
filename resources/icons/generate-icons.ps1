param(
  [string]$SourcePng = "resources\\icons\\rss-icon-source.png",
  [string]$OutputDir = "src-tauri\\icons"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$sourcePath = Join-Path $repoRoot $SourcePng
$outputPath = Join-Path $repoRoot $OutputDir

if (-not (Test-Path $sourcePath)) {
  throw "Canonical icon source was not found: $sourcePath"
}

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

Push-Location $repoRoot
try {
  npx --prefix app tauri icon $sourcePath -o $outputPath
  python (Join-Path $PSScriptRoot "build_windows_ico.py") $sourcePath (Join-Path $outputPath "icon.ico")

  Copy-Item -Path (Join-Path $outputPath "icon.ico") -Destination (Join-Path $repoRoot "app\\public\\rss.ico") -Force
  Copy-Item -Path (Join-Path $outputPath "icon.ico") -Destination (Join-Path $repoRoot "resources\\icons\\rss.ico") -Force
  Copy-Item -Path (Join-Path $outputPath "icon.ico") -Destination (Join-Path $repoRoot "rss.ico") -Force
} finally {
  Pop-Location
}
