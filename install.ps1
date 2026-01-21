# Pomodoro TUI Installer for Windows
# Run: irm https://raw.githubusercontent.com/treepo1/pomodoro-tui/master/install.ps1 | iex

param(
    [switch]$Help,
    [string]$Version,
    [string]$Binary,
    [string]$Dir,
    [switch]$NoModifyPath
)

$ErrorActionPreference = "Stop"

$Repo = "treepo1/pomodoro-tui"
$BinaryName = "pomotui.exe"
$DefaultInstallDir = "$env:LOCALAPPDATA\Programs\pomotui"
$AssetName = "pomotui-windows-x64.exe"

# Colors
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Level = "Info"
    )

    switch ($Level) {
        "Error" { Write-Host $Message -ForegroundColor Red }
        "Warning" { Write-Host $Message -ForegroundColor Yellow }
        "Success" { Write-Host $Message -ForegroundColor Green }
        "Muted" { Write-Host $Message -ForegroundColor DarkGray }
        "Cyan" { Write-Host $Message -ForegroundColor Cyan }
        default { Write-Host $Message }
    }
}

function Show-Usage {
    Write-Host @"
Pomodoro TUI Installer for Windows

Usage: install.ps1 [options]

Options:
    -Help               Display this help message
    -Version <version>  Install a specific version (e.g., 1.0.0)
    -Binary <path>      Install from a local binary instead of downloading
    -Dir <path>         Custom install directory (default: $DefaultInstallDir)
    -NoModifyPath       Don't add install directory to PATH

Examples:
    irm https://raw.githubusercontent.com/$Repo/master/install.ps1 | iex
    .\install.ps1 -Version 1.0.0
    .\install.ps1 -Binary C:\path\to\pomotui.exe
    .\install.ps1 -Dir "C:\CustomPath"
"@
}

function Test-ReleaseExists {
    param([string]$Ver)

    try {
        $response = Invoke-WebRequest -Uri "https://github.com/$Repo/releases/tag/v$Ver" -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
        return $true
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 404) {
            return $false
        }
        # Other errors might be network issues, let it continue
        return $true
    }
}

function Get-InstalledVersion {
    $pomotui = Get-Command pomotui -ErrorAction SilentlyContinue
    if ($pomotui) {
        try {
            $version = & pomotui --version 2>$null
            return $version
        }
        catch {
            return $null
        }
    }
    return $null
}

function Show-DownloadProgress {
    param(
        [int]$PercentComplete,
        [int]$Width = 40
    )

    $completed = [math]::Floor($Width * $PercentComplete / 100)
    $remaining = $Width - $completed

    # Use ASCII characters that work reliably in Windows console
    $bar = ("#" * $completed) + ("-" * $remaining)

    # Clear line and write progress
    $cursorLeft = [Console]::CursorLeft
    [Console]::SetCursorPosition(0, [Console]::CursorTop)
    Write-Host "$bar $PercentComplete%" -NoNewline -ForegroundColor Cyan
    # Clear any remaining characters from previous longer output
    $padding = " " * 10
    Write-Host $padding -NoNewline
    [Console]::SetCursorPosition(0, [Console]::CursorTop)
    Write-Host "$bar $PercentComplete%" -NoNewline -ForegroundColor Cyan
}

function Get-FileWithProgress {
    param(
        [string]$Url,
        [string]$OutFile
    )

    try {
        # Use Invoke-WebRequest with progress preference
        $ProgressPreference = 'SilentlyContinue'

        # Get file size first via HEAD request
        $headRequest = [System.Net.WebRequest]::Create($Url)
        $headRequest.Method = "HEAD"
        $headRequest.AllowAutoRedirect = $true
        $headResponse = $headRequest.GetResponse()
        $totalBytes = $headResponse.ContentLength
        $headResponse.Close()

        if ($totalBytes -gt 0) {
            # Download with custom progress using HttpClient for better streaming
            $httpClient = New-Object System.Net.Http.HttpClient
            $response = $httpClient.GetAsync($Url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result
            $stream = $response.Content.ReadAsStreamAsync().Result
            $fileStream = [System.IO.File]::Create($OutFile)

            $buffer = New-Object byte[] 65536
            $downloadedBytes = 0
            $lastProgress = -1

            try {
                while (($bytesRead = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                    $fileStream.Write($buffer, 0, $bytesRead)
                    $downloadedBytes += $bytesRead
                    $progress = [math]::Floor($downloadedBytes * 100 / $totalBytes)

                    if ($progress -ne $lastProgress) {
                        Show-DownloadProgress -PercentComplete $progress
                        $lastProgress = $progress
                    }
                }
                Write-Host "" # New line after progress
            }
            finally {
                $stream.Close()
                $fileStream.Close()
                $httpClient.Dispose()
            }
        }
        else {
            # Fallback without progress
            Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
        }
    }
    catch {
        # Fallback to simple download with built-in progress
        Write-ColorOutput "Using fallback download method..." -Level Muted
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
    }
}

function Install-Pomotui {
    # Show help if requested
    if ($Help) {
        Show-Usage
        return
    }

    # Set install directory
    $InstallDir = if ($Dir) { $Dir } else { $DefaultInstallDir }

    Write-ColorOutput "Pomodoro TUI Installer" -Level Cyan
    Write-ColorOutput ("=" * 40) -Level Cyan
    Write-Host ""

    # Handle local binary installation
    if ($Binary) {
        if (-not (Test-Path $Binary)) {
            Write-ColorOutput "Error: Binary not found at $Binary" -Level Error
            exit 1
        }

        Write-ColorOutput "Installing from local binary: $Binary" -Level Muted

        # Create install directory
        if (-not (Test-Path $InstallDir)) {
            New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
        }

        $InstallPath = Join-Path $InstallDir $BinaryName
        Copy-Item -Path $Binary -Destination $InstallPath -Force

        Write-ColorOutput "Successfully installed pomotui from local binary!" -Level Success

        Add-ToPath -InstallDir $InstallDir -NoModify:$NoModifyPath
        Install-Mpv
        Show-Banner
        return
    }

    # Get version to install
    $VersionToInstall = $null
    $DownloadUrl = $null

    if ($Version) {
        # Strip leading 'v' if present
        $Version = $Version -replace '^v', ''

        # Validate release exists
        Write-ColorOutput "Validating release v$Version..." -Level Muted
        if (-not (Test-ReleaseExists -Ver $Version)) {
            Write-ColorOutput "Error: Release v$Version not found" -Level Error
            Write-ColorOutput "Available releases: https://github.com/$Repo/releases" -Level Muted
            exit 1
        }

        $VersionToInstall = $Version
        $DownloadUrl = "https://github.com/$Repo/releases/download/v$Version/$AssetName"
    }
    else {
        # Get latest release
        Write-ColorOutput "Fetching latest release..." -Level Muted
        try {
            $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -UseBasicParsing
            $VersionToInstall = $Release.tag_name -replace '^v', ''
            $Asset = $Release.assets | Where-Object { $_.name -eq $AssetName }

            if (-not $Asset) {
                Write-ColorOutput "Error: Could not find asset $AssetName" -Level Error
                Write-Host "Available assets:"
                $Release.assets | ForEach-Object { Write-Host "  - $($_.name)" }
                exit 1
            }

            $DownloadUrl = $Asset.browser_download_url
        }
        catch {
            Write-ColorOutput "Error: Failed to fetch latest release information" -Level Error
            Write-ColorOutput $_.Exception.Message -Level Error
            exit 1
        }
    }

    # Check if already installed
    $InstalledVersion = Get-InstalledVersion
    if ($InstalledVersion -and $InstalledVersion -eq $VersionToInstall) {
        Write-ColorOutput "Version $VersionToInstall is already installed" -Level Success
        exit 0
    }

    if ($InstalledVersion) {
        Write-ColorOutput "Currently installed: $InstalledVersion" -Level Muted
    }

    Write-Host ""
    Write-ColorOutput "Installing pomotui version: $VersionToInstall" -Level Info
    Write-ColorOutput "Install directory: $InstallDir" -Level Muted
    Write-Host ""

    # Create install directory
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # Download binary
    $TempFile = Join-Path $env:TEMP $BinaryName
    Write-ColorOutput "Downloading..." -Level Muted

    try {
        Get-FileWithProgress -Url $DownloadUrl -OutFile $TempFile
    }
    catch {
        Write-ColorOutput "Error: Download failed" -Level Error
        Write-ColorOutput $_.Exception.Message -Level Error
        exit 1
    }

    # Move to install directory
    $InstallPath = Join-Path $InstallDir $BinaryName
    Move-Item -Path $TempFile -Destination $InstallPath -Force

    Write-ColorOutput "Successfully installed pomotui v$VersionToInstall!" -Level Success

    Add-ToPath -InstallDir $InstallDir -NoModify:$NoModifyPath
    Install-Mpv
    Show-Banner
}

function Add-ToPath {
    param(
        [string]$InstallDir,
        [switch]$NoModify
    )

    if ($NoModify) {
        return
    }

    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")

    # Check if already in PATH
    if ($UserPath -like "*$InstallDir*") {
        Write-ColorOutput "PATH already configured" -Level Muted
        return
    }

    Write-ColorOutput "Adding $InstallDir to PATH..." -Level Muted

    # Avoid double semicolons
    $UserPath = $UserPath.TrimEnd(';')
    $NewPath = "$UserPath;$InstallDir"

    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    $env:Path = "$env:Path;$InstallDir"

    Write-ColorOutput "PATH updated successfully" -Level Success
    Write-ColorOutput "You may need to restart your terminal for PATH changes to take effect" -Level Warning
}

function Install-Mpv {
    Write-Host ""
    Write-ColorOutput "Checking for mpv (required for music feature)..." -Level Muted

    $mpvPath = Get-Command mpv -ErrorAction SilentlyContinue

    if ($mpvPath) {
        Write-ColorOutput "mpv is already installed" -Level Success
        return
    }

    Write-ColorOutput "mpv not found. Attempting to install..." -Level Warning

    # Try winget first (Windows 10 1709+ and Windows 11)
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-ColorOutput "Installing mpv via winget..." -Level Muted
        try {
            winget install --id=mpv.net -e --accept-source-agreements --accept-package-agreements
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "mpv installed successfully" -Level Success
                return
            }
        }
        catch {}
    }

    # Try chocolatey
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if ($choco) {
        Write-ColorOutput "Installing mpv via Chocolatey..." -Level Muted
        try {
            choco install mpv -y
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "mpv installed successfully" -Level Success
                return
            }
        }
        catch {}
    }

    # Try scoop
    $scoop = Get-Command scoop -ErrorAction SilentlyContinue
    if ($scoop) {
        Write-ColorOutput "Installing mpv via Scoop..." -Level Muted
        try {
            scoop install mpv
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "mpv installed successfully" -Level Success
                return
            }
        }
        catch {}
    }

    Write-ColorOutput "Could not install mpv automatically" -Level Warning
    Write-Host "Please install mpv manually using one of these methods:"
    Write-Host "  winget install mpv.net"
    Write-Host "  choco install mpv"
    Write-Host "  scoop install mpv"
    Write-Host "  or download from: https://mpv.io/installation/"
}

function Show-Banner {
    Write-Host ""
    Write-ColorOutput "+=======================================+" -Level Cyan
    Write-Host "|       " -NoNewline -ForegroundColor Cyan
    Write-Host "Pomodoro TUI Installed" -NoNewline -ForegroundColor Green
    Write-Host "        |" -ForegroundColor Cyan
    Write-ColorOutput "+=======================================+" -Level Cyan
    Write-Host ""
    Write-ColorOutput "To get started:" -Level Muted
    Write-Host ""
    Write-Host "  pomotui          " -NoNewline
    Write-ColorOutput "# Start the app" -Level Muted
    Write-Host "  pomotui --help   " -NoNewline
    Write-ColorOutput "# Show help" -Level Muted
    Write-Host ""
    Write-Host "For more information: " -NoNewline
    Write-Host "https://github.com/$Repo"
    Write-Host ""
}

# GitHub Actions support
if ($env:GITHUB_ACTIONS -eq "true") {
    $InstallDir = if ($Dir) { $Dir } else { $DefaultInstallDir }
    Add-Content -Path $env:GITHUB_PATH -Value $InstallDir
    Write-ColorOutput "Added $InstallDir to GITHUB_PATH" -Level Muted
}

# Run installer
Install-Pomotui
