import { parseArgs } from "util";
import { DEFAULT_CONFIG, type PomodoroConfig } from "./types";
import { normalizeSessionCode, validateSessionCode } from "./jam";
import { performUpdate, getCurrentVersion } from "./updater";
import type { MusicMode } from "./music";

export interface JamConfig {
  enabled: boolean;
  isHost: boolean;
  sessionCode?: string;
  participantName?: string;
  server?: string;
}

export interface AppConfig {
  pomodoro: PomodoroConfig;
  historyFile?: string;
  musicMode: MusicMode;
  jam: JamConfig;
}

export function showHelp(): void {
  console.log(`
Pomodoro Timer - A TUI pomodoro timer

Usage: pomotui [options]

Options:
  -w, --work <minutes>     Work session duration (default: ${DEFAULT_CONFIG.workDuration})
  -s, --short <minutes>    Short break duration (default: ${DEFAULT_CONFIG.shortBreakDuration})
  -l, --long <minutes>     Long break duration (default: ${DEFAULT_CONFIG.longBreakDuration})
  -c, --cycles <number>    Pomodoros before long break (default: ${DEFAULT_CONFIG.pomodorosBeforeLongBreak})
  -d, --data <path>        Path to history JSON file (default: ~/.pomodoro/history.json)
  -m, --music <mode>       Music mode: radio, off (default: radio)
  -v, --version            Show version number
  --update                 Check for and install updates
  -h, --help               Show this help message

Jam Session (collaborative mode):
  --host                   Host a new jam session
  --join <code>            Join an existing jam session by code
  --name <name>            Your display name in the session (uses saved name)
  --server <url>           Custom PartyKit server URL

Examples:
  pomotui                              # Use default durations (25/5/15)
  pomotui -w 50 -s 10 -l 30            # 50min work, 10min short, 30min long
  pomotui --work 45                    # 45min work sessions
  pomotui -d ~/obsidian/pomodoro.json  # Custom history file
  pomotui -m off                       # Disable music
  pomotui --host --name "Alice"        # Host a jam session
  pomotui --join XYZ234 --name "Bob"   # Join a jam session

Controls:
  [s] Start    [p] Pause    [r] Reset    [n] Next    [q] Quit
  [m] Toggle music    [>] Next station
  (In jam mode, only the host can control the timer)

Music:
  Lofi radio plays automatically during work sessions and pauses during breaks.
  Requires mpv, ffplay, or vlc installed for audio playback.

History:
  Completed sessions are saved to the history file in JSON format.
  Each entry includes: timestamp, session type, duration, and daily count.
`);
}

async function handleUpdateCommand(): Promise<void> {
  try {
    await performUpdate();
  } catch (error) {
    console.error(
      `Update failed: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }
  process.exit(0);
}

export function parseConfig(): AppConfig | null {
  try {
    const { values } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        work: { type: "string", short: "w" },
        short: { type: "string", short: "s" },
        long: { type: "string", short: "l" },
        cycles: { type: "string", short: "c" },
        data: { type: "string", short: "d" },
        music: { type: "string", short: "m" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        update: { type: "boolean" },
        host: { type: "boolean" },
        join: { type: "string" },
        name: { type: "string" },
        server: { type: "string" },
      },
      strict: true,
    });

    if (values.help) {
      showHelp();
      return null;
    }

    if (values.version) {
      console.log(`pomotui version ${getCurrentVersion()}`);
      return null;
    }

    if (values.update) {
      handleUpdateCommand();
      return null;
    }

    const pomodoro: PomodoroConfig = { ...DEFAULT_CONFIG };

    if (values.work) {
      const work = parseInt(values.work, 10);
      if (isNaN(work) || work < 1) {
        console.error("Error: Work duration must be a positive number");
        process.exit(1);
      }
      pomodoro.workDuration = work;
    }
    if (values.short) {
      const short = parseInt(values.short, 10);
      if (isNaN(short) || short < 1) {
        console.error("Error: Short break duration must be a positive number");
        process.exit(1);
      }
      pomodoro.shortBreakDuration = short;
    }

    if (values.long) {
      const long = parseInt(values.long, 10);
      if (isNaN(long) || long < 1) {
        console.error("Error: Long break duration must be a positive number");
        process.exit(1);
      }
      pomodoro.longBreakDuration = long;
    }

    if (values.cycles) {
      const cycles = parseInt(values.cycles, 10);
      if (isNaN(cycles) || cycles < 1) {
        console.error("Error: Cycles must be a positive number");
        process.exit(1);
      }
      pomodoro.pomodorosBeforeLongBreak = cycles;
    }

    let musicMode: MusicMode = "radio";
    if (values.music) {
      if (!["radio", "off"].includes(values.music)) {
        console.error("Error: Music mode must be one of: radio, off");
        process.exit(1);
      }
      musicMode = values.music as MusicMode;
    }

    const jamEnabled = values.host || !!values.join;
    const isHost = values.host || false;
    const sessionCode = values.join
      ? normalizeSessionCode(values.join)
      : undefined;

    if (values.join && !validateSessionCode(values.join)) {
      console.error(
        "Error: Invalid session code. Must be 6 characters (e.g., XYZ234)",
      );
      process.exit(1);
    }

    if (values.host && values.join) {
      console.error("Error: Cannot use both --host and --join");
      process.exit(1);
    }

    const jam: JamConfig = {
      enabled: jamEnabled,
      isHost,
      sessionCode,
      participantName: values.name,
      server: values.server,
    };

    return {
      pomodoro,
      historyFile: values.data,
      musicMode,
      jam,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    console.error("Use --help for usage information");
    process.exit(1);
  }
}
