import type { PlatformInfo } from "./types";
import { version } from "../../package.json";

export const GITHUB_REPO = "treepo1/pomodoro-tui";
export const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const CHECK_TIMEOUT_MS = 5000;

export function getPlatformInfo(): PlatformInfo {
  const platform = process.platform;
  const arch = process.arch;

  let normalizedPlatform: PlatformInfo["platform"];
  let normalizedArch: PlatformInfo["arch"];

  // Map platform
  switch (platform) {
    case "darwin":
      normalizedPlatform = "darwin";
      break;
    case "linux":
      normalizedPlatform = "linux";
      break;
    case "win32":
      normalizedPlatform = "windows";
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  // Map architecture
  const archStr = arch as string;
  switch (archStr) {
    case "x64":
    case "amd64":
      normalizedArch = "x64";
      break;
    case "arm64":
      normalizedArch = "arm64";
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  // Construct binary name
  const ext = normalizedPlatform === "windows" ? ".exe" : "";
  const binaryName = `pomotui-${normalizedPlatform}-${normalizedArch}${ext}`;

  return {
    platform: normalizedPlatform,
    arch: normalizedArch,
    binaryName,
  };
}

export function getCurrentVersion(): string {
  return version;
}
