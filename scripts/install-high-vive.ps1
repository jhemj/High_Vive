param(
  [string]$Server = "https://high-vive-league.ngmptdz.chatgpt.site",
  [ValidateSet("codex", "claude-code")]
  [string]$Agent = "codex"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

Write-Host "High-Vive · Windows setup" -ForegroundColor Cyan

if ($env:HIGH_VIVE_SERVER) { $Server = $env:HIGH_VIVE_SERVER }
if ($env:HIGH_VIVE_AGENT) { $Agent = $env:HIGH_VIVE_AGENT }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Node.js 22+ is required. Install it from https://nodejs.org and run this command again."
  }
  Write-Host "Installing Node.js LTS…"
  winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
}

$nodeMajor = [int]((& node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
  throw "Node.js 22+ is required. Update Node.js and run this command again."
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  if (Get-Command corepack -ErrorAction SilentlyContinue) {
    corepack enable
    corepack prepare pnpm@11.9.0 --activate
  } else {
    npm install --global pnpm@11.9.0
  }
  Refresh-Path
}

if ($Agent -eq "claude-code" -and -not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Claude Code…"
  npm install --global @anthropic-ai/claude-code
  Refresh-Path
}

$installRoot = Join-Path $env:LOCALAPPDATA "High-Vive"
$sourceRoot = Join-Path $installRoot "source"
$archive = Join-Path $installRoot "high-vive-main.zip"
$expanded = Join-Path $installRoot "expanded"

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $expanded -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Downloading the official High-Vive CLI…"
Invoke-WebRequest -Uri "https://github.com/jhemj/High_Vive/archive/refs/heads/main.zip" -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $expanded -Force
Remove-Item -LiteralPath $sourceRoot -Recurse -Force -ErrorAction SilentlyContinue
Move-Item -LiteralPath (Join-Path $expanded "High_Vive-main") -Destination $sourceRoot
Remove-Item -LiteralPath $expanded -Recurse -Force
Remove-Item -LiteralPath $archive -Force

Push-Location $sourceRoot
try {
  pnpm install --frozen-lockfile
  pnpm high-vive -- assess --server $Server --agent $Agent
} finally {
  Pop-Location
}
