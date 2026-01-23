import type {
  SessionType,
  PomodoroConfig,
  GroupConnectionState,
} from "./types";

export function getSessionColor(session: SessionType): string {
  switch (session) {
    case "work":
      return "green";
    case "shortBreak":
      return "cyan";
    case "longBreak":
      return "blue";
  }
}

export function getSessionLabel(session: SessionType): string {
  switch (session) {
    case "work":
      return "WORK";
    case "shortBreak":
      return "SHORT BREAK";
    case "longBreak":
      return "LONG BREAK";
  }
}

export function getSessionDuration(
  session: SessionType,
  config: PomodoroConfig,
): number {
  switch (session) {
    case "work":
      return config.workDuration;
    case "shortBreak":
      return config.shortBreakDuration;
    case "longBreak":
      return config.longBreakDuration;
  }
}

export function getConnectionDisplay(state: GroupConnectionState) {
  switch (state) {
    case "connected":
      return { symbol: "●", color: "green", text: "Connected" };
    case "connecting":
      return { symbol: "○", color: "yellow", text: "Connecting..." };
    case "error":
      return { symbol: "●", color: "red", text: "Error" };
    default:
      return { symbol: "○", color: "gray", text: "Disconnected" };
  }
}

export function notifyUser(): void {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      Bun.spawn(["afplay", "/System/Library/Sounds/Glass.aiff"], {
        stdout: "ignore",
        stderr: "ignore",
      });
    } else if (platform === "win32") {
      Bun.spawn(
        ["powershell", "-c", "[System.Media.SystemSounds]::Asterisk.Play()"],
        { stdout: "ignore", stderr: "ignore" },
      );
    } else {
      Bun.spawn(
        [
          "sh",
          "-c",
          "paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true",
        ],
        {
          stdout: "ignore",
          stderr: "ignore",
        },
      );
    }
  } catch {
    // Ignore errors if sound fails to play
  }
}
