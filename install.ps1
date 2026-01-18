# Pomodoro TUI Installer for Windows
# Run: irm https://raw.githubusercontent.com/treepo1/pomodoro-tui/master/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "treepo1/pomodoro-tui"
$BinaryName = "pomotui.exe"
$InstallDir = "$env:LOCALAPPDATA\Programs\pomotui"
$AssetName = "pomotui-windows-x64.exe"

Write-Host "Pomodoro TUI Installer" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host "Install directory: $InstallDir"
Write-Host ""

# Create install directory if it doesn't exist
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Get latest release
Write-Host "Fetching latest release..."
$Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
$Version = $Release.tag_name
$Asset = $Release.assets | Where-Object { $_.name -eq $AssetName }

if (-not $Asset) {
    Write-Host "Error: Could not find asset $AssetName" -ForegroundColor Red
    Write-Host "Available assets:"
    $Release.assets | ForEach-Object { Write-Host "  - $($_.name)" }
    exit 1
}

$DownloadUrl = $Asset.browser_download_url

Write-Host "Latest version: $Version"
Write-Host "Downloading from: $DownloadUrl"
Write-Host ""

# Download binary
$TempFile = Join-Path $env:TEMP $BinaryName
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempFile

# Move to install directory
$InstallPath = Join-Path $InstallDir $BinaryName
Move-Item -Path $TempFile -Destination $InstallPath -Force

# Add to PATH if not already there
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    Write-Host "Adding $InstallDir to PATH..."
    $NewPath = "$UserPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = "$env:Path;$InstallDir"
    Write-Host "PATH updated. You may need to restart your terminal for changes to take effect." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Successfully installed pomotui $Version!" -ForegroundColor Green
Write-Host ""

# Install mpv for music/radio feature
Write-Host "Checking for mpv (required for music feature)..."
$mpvPath = Get-Command mpv -ErrorAction SilentlyContinue

if ($mpvPath) {
    Write-Host "mpv is already installed." -ForegroundColor Green
} else {
    Write-Host "mpv not found. Attempting to install..."
    
    # Try winget first (Windows 10 1709+ and Windows 11)
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "Installing mpv via winget..."
        winget install --id=mpv.net -e --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -eq 0) {
            Write-Host "mpv installed successfully." -ForegroundColor Green
        } else {
            Write-Host "Warning: winget installation failed. Please install mpv manually:" -ForegroundColor Yellow
            Write-Host "  winget install mpv.net"
            Write-Host "  or download from: https://mpv.io/installation/"
        }
    }
    # Try chocolatey
    elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Host "Installing mpv via Chocolatey..."
        choco install mpv -y
        if ($LASTEXITCODE -eq 0) {
            Write-Host "mpv installed successfully." -ForegroundColor Green
        } else {
            Write-Host "Warning: Chocolatey installation failed. Please install mpv manually:" -ForegroundColor Yellow
            Write-Host "  choco install mpv"
            Write-Host "  or download from: https://mpv.io/installation/"
        }
    }
    # Try scoop
    elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        Write-Host "Installing mpv via Scoop..."
        scoop install mpv
        if ($LASTEXITCODE -eq 0) {
            Write-Host "mpv installed successfully." -ForegroundColor Green
        } else {
            Write-Host "Warning: Scoop installation failed. Please install mpv manually:" -ForegroundColor Yellow
            Write-Host "  scoop install mpv"
            Write-Host "  or download from: https://mpv.io/installation/"
        }
    }
    else {
        Write-Host "Warning: No package manager found (winget, chocolatey, or scoop)." -ForegroundColor Yellow
        Write-Host "Please install mpv manually from: https://mpv.io/installation/"
    }
}

Write-Host ""
Write-Host "Run 'pomotui --help' to get started."
