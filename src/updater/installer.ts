import { tmpdir } from "os";
import { join } from "path";
import { getPlatformInfo, getCurrentVersion, GITHUB_REPO } from "./config";
import { checkForUpdates, fetchLatestRelease } from "./checker";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function printMessage(level: "info" | "muted" | "success" | "warning" | "error", message: string): void {
  const colorMap = {
    info: colors.reset,
    muted: colors.dim,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red,
  };
  console.log(`${colorMap[level]}${message}${colors.reset}`);
}

function printProgress(downloaded: number, total: number, width = 40): void {
  if (total <= 0) return;

  const percent = Math.min(100, Math.floor((downloaded * 100) / total));
  const completed = Math.floor((percent * width) / 100);
  const remaining = width - completed;

  const bar = "█".repeat(completed) + "░".repeat(remaining);
  process.stdout.write(`\r${colors.cyan}${bar} ${percent}%${colors.reset}`);
}

async function downloadFileWithProgress(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;

  // Show progress if we know the total size and stdout is a TTY
  const showProgress = totalBytes > 0 && process.stdout.isTTY;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    downloadedBytes += value.length;

    if (showProgress) {
      printProgress(downloadedBytes, totalBytes);
    }
  }

  if (showProgress) {
    printProgress(totalBytes, totalBytes);
    console.log(""); // New line after progress
  }

  // Combine chunks and write to file
  const buffer = new Uint8Array(downloadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  await Bun.write(destPath, buffer);
}

function getInstallPath(): string {
  const platform = process.platform;

  if (platform === "win32") {
    // Windows: install to LocalAppData
    const localAppData = process.env.LOCALAPPDATA || join(process.env.USERPROFILE || "", "AppData", "Local");
    return join(localAppData, "Programs", "pomotui", "pomotui.exe");
  } else {
    // Unix: try to find where pomotui is currently installed, fallback to user-local
    const currentPath = process.argv[0];
    if (currentPath && !currentPath.includes("bun") && !currentPath.includes("node")) {
      return currentPath;
    }

    // Prefer user-local installation
    const homeDir = process.env.HOME || "";
    const userLocalPath = join(homeDir, ".pomotui", "bin", "pomotui");

    // Check if user-local install exists
    try {
      const stat = Bun.file(userLocalPath);
      if (stat.size > 0) {
        return userLocalPath;
      }
    } catch {
      // File doesn't exist, check /usr/local/bin
    }

    // Check if /usr/local/bin version exists
    const systemPath = "/usr/local/bin/pomotui";
    try {
      const stat = Bun.file(systemPath);
      if (stat.size > 0) {
        return systemPath;
      }
    } catch {
      // File doesn't exist
    }

    // Default to user-local for new installs
    return userLocalPath;
  }
}

async function createBackup(installPath: string): Promise<string | null> {
  try {
    const backupPath = `${installPath}.backup`;
    const file = Bun.file(installPath);
    if (await file.exists()) {
      const content = await file.arrayBuffer();
      await Bun.write(backupPath, content);
      return backupPath;
    }
  } catch {
    // No backup possible, continue anyway
  }
  return null;
}

async function restoreBackup(backupPath: string, installPath: string): Promise<void> {
  try {
    const file = Bun.file(backupPath);
    if (await file.exists()) {
      const content = await file.arrayBuffer();
      await Bun.write(installPath, content);
      await Bun.spawn(["rm", backupPath]).exited;
    }
  } catch {
    printMessage("error", "Failed to restore backup");
  }
}

async function cleanupBackup(backupPath: string): Promise<void> {
  try {
    await Bun.spawn(["rm", backupPath]).exited;
  } catch {
    // Ignore cleanup errors
  }
}

async function installUnix(tempPath: string, installPath: string): Promise<void> {
  // Make executable
  await Bun.spawn(["chmod", "+x", tempPath]).exited;

  const installDir = installPath.substring(0, installPath.lastIndexOf("/"));

  // Create install directory if it doesn't exist
  await Bun.spawn(["mkdir", "-p", installDir]).exited;

  try {
    // Check if we can write to the install directory
    const testFile = join(installDir, ".pomotui-test");
    try {
      await Bun.write(testFile, "test");
      await Bun.spawn(["rm", testFile]).exited;
      // We have write access, move directly
      await Bun.spawn(["mv", tempPath, installPath]).exited;
    } catch {
      // Need sudo
      printMessage("warning", `Need sudo to install to ${installDir}`);
      const result = await Bun.spawn(["sudo", "mv", tempPath, installPath], {
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      }).exited;
      if (result !== 0) {
        throw new Error("Failed to install with sudo");
      }
    }
  } catch (error) {
    throw new Error(`Installation failed: ${error}`);
  }
}

async function installWindows(tempPath: string, installPath: string): Promise<void> {
  // Create install directory if needed
  const installDir = installPath.substring(0, installPath.lastIndexOf("\\"));
  await Bun.spawn(["cmd", "/c", "mkdir", installDir], { stdout: "ignore", stderr: "ignore" }).exited;

  // On Windows, we can't replace a running executable directly
  // Create a batch script that will replace the binary after we exit
  const batchScript = `
@echo off
setlocal enabledelayedexpansion

:wait_loop
timeout /t 1 /nobreak >nul
tasklist /fi "imagename eq pomotui.exe" 2>nul | find /i "pomotui.exe" >nul
if !errorlevel! equ 0 (
    goto wait_loop
)

move /y "${tempPath}" "${installPath}"
if !errorlevel! equ 0 (
    echo Updated successfully!
) else (
    echo Update failed!
)
del "%~f0"
`;

  const batchPath = join(tmpdir(), "pomotui-update.bat");
  await Bun.write(batchPath, batchScript);

  // Start the batch script and exit
  Bun.spawn(["cmd", "/c", "start", "/b", batchPath], {
    stdout: "ignore",
    stderr: "ignore",
  });

  printMessage("warning", "Update will complete after this process exits...");
}

export interface UpdateOptions {
  force?: boolean;
  version?: string;
}

export async function validateRelease(version: string): Promise<boolean> {
  try {
    const response = await fetch(`https://github.com/${GITHUB_REPO}/releases/tag/v${version}`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function performUpdate(options: UpdateOptions = {}): Promise<void> {
  const currentVersion = getCurrentVersion();
  const platformInfo = getPlatformInfo();

  printMessage("muted", `Current version: ${currentVersion}`);
  printMessage("muted", `Platform: ${platformInfo.platform}-${platformInfo.arch}`);
  console.log("");

  let result;
  let targetVersion: string;

  if (options.version) {
    // Validate specific version
    const cleanVersion = options.version.replace(/^v/, "");
    printMessage("muted", `Validating release v${cleanVersion}...`);

    if (!(await validateRelease(cleanVersion))) {
      printMessage("error", `Error: Release v${cleanVersion} not found`);
      printMessage("muted", `Available releases: https://github.com/${GITHUB_REPO}/releases`);
      throw new Error(`Release v${cleanVersion} not found`);
    }

    targetVersion = cleanVersion;

    // Check if already on this version
    if (currentVersion === cleanVersion && !options.force) {
      printMessage("success", `You are already on version ${cleanVersion}`);
      return;
    }

    // Fetch release info to get download URL
    const release = await fetchLatestRelease();
    const asset = release.assets.find((a) => a.name === platformInfo.binaryName);

    if (!asset) {
      throw new Error(`No binary available for ${platformInfo.platform}-${platformInfo.arch}`);
    }

    // Construct download URL for specific version
    result = {
      updateAvailable: true,
      currentVersion,
      latestVersion: cleanVersion,
      downloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v${cleanVersion}/${platformInfo.binaryName}`,
    };
  } else {
    // Check for latest
    printMessage("muted", "Checking for updates...");
    result = await checkForUpdates();
    targetVersion = result.latestVersion.replace(/^v/, "");

    if (!result.updateAvailable && !options.force) {
      printMessage("success", `You are already on the latest version (${currentVersion})`);
      return;
    }
  }

  if (!result.downloadUrl) {
    throw new Error(`No binary available for ${platformInfo.platform}-${platformInfo.arch}`);
  }

  console.log("");
  if (result.updateAvailable) {
    printMessage("info", `New version available: ${targetVersion}`);
  } else {
    printMessage("info", `Reinstalling version: ${targetVersion}`);
  }

  // Download to temp directory
  const tempPath = join(tmpdir(), platformInfo.binaryName);

  printMessage("muted", "Downloading...");
  try {
    await downloadFileWithProgress(result.downloadUrl, tempPath);
  } catch (error) {
    printMessage("error", `Download failed: ${error}`);
    throw error;
  }

  const installPath = getInstallPath();
  printMessage("muted", `Installing to ${installPath}...`);

  // Create backup before installing
  const backupPath = await createBackup(installPath);

  try {
    if (process.platform === "win32") {
      await installWindows(tempPath, installPath);
    } else {
      await installUnix(tempPath, installPath);
    }

    // Clean up backup on success
    if (backupPath) {
      await cleanupBackup(backupPath);
    }

    console.log("");
    printMessage("success", `Successfully updated to v${targetVersion}!`);
  } catch (error) {
    // Restore backup on failure
    if (backupPath) {
      printMessage("warning", "Update failed, restoring previous version...");
      await restoreBackup(backupPath, installPath);
    }
    throw error;
  }
}

export async function getAvailableVersions(): Promise<string[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "pomotui-updater",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const releases = (await response.json()) as Array<{ tag_name: string }>;
    return releases.map((r) => r.tag_name.replace(/^v/, ""));
  } catch {
    return [];
  }
}
