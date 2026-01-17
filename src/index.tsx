import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import { parseArgs } from "util";
import { Pomodoro } from "./pomodoro";
import { HistoryManager } from "./history";
import { MusicManager, type MusicMode } from "./music";
import { JamManager, validateSessionCode, normalizeSessionCode } from "./jam";
import type {
  PomodoroConfig,
  PomodoroState,
  SessionType,
  JamParticipant,
  JamConnectionState,
} from "./types";
import { DEFAULT_CONFIG } from "./types";
import { checkForUpdates, performUpdate, getCurrentVersion } from "./updater";
import { renderBigText } from "./ui";

interface JamConfig {
  enabled: boolean;
  isHost: boolean;
  sessionCode?: string;
  participantName: string;
  server?: string;
}

interface AppConfig {
  pomodoro: PomodoroConfig;
  historyFile?: string;
  musicMode: MusicMode;
  jam: JamConfig;
}

function showHelp(): void {
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
  --name <name>            Your display name in the session (default: User)
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

function parseConfig(): AppConfig | null {
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
        // Jam session options
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

    // Jam session config
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
      participantName: values.name || "User",
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

function getSessionColor(session: SessionType): string {
  switch (session) {
    case "work":
      return "green";
    case "shortBreak":
      return "cyan";
    case "longBreak":
      return "blue";
  }
}

function getSessionLabel(session: SessionType): string {
  switch (session) {
    case "work":
      return "WORK";
    case "shortBreak":
      return "SHORT BREAK";
    case "longBreak":
      return "LONG BREAK";
  }
}

function getSessionDuration(
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

function notifyUser(): void {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      Bun.spawn(["afplay", "/System/Library/Sounds/Glass.aiff"], {
        stdout: "ignore",
        stderr: "ignore",
      });
    } else if (platform === "win32") {
      // Use SystemSounds which is locale-independent
      Bun.spawn(
        ["powershell", "-c", "[System.Media.SystemSounds]::Asterisk.Play()"],
        { stdout: "ignore", stderr: "ignore" },
      );
    } else {
      // Linux - try paplay first, fall back to aplay
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

interface PomodoroTUIProps {
  config: AppConfig;
}

function PomodoroTUI({ config }: PomodoroTUIProps) {
  const { exit } = useApp();
  const [pomodoro] = useState(() => new Pomodoro(config.pomodoro));
  const [history] = useState(() => new HistoryManager(config.historyFile));
  const [music] = useState(() => new MusicManager(config.musicMode));
  const [state, setState] = useState<PomodoroState>(pomodoro.getState());
  const [todayStats, setTodayStats] = useState(history.getTodayStats());
  const [musicStatus, setMusicStatus] = useState(music.getStatusText());
  const [updateAvailable, setUpdateAvailable] = useState<string | null>(null);

  // Jam session state
  const [jamManager, setJamManager] = useState<JamManager | null>(null);
  const [jamParticipants, setJamParticipants] = useState<JamParticipant[]>([]);
  const [jamConnectionState, setJamConnectionState] =
    useState<JamConnectionState>("disconnected");
  const [jamSessionCode, setJamSessionCode] = useState<string>("");
  const [isCurrentHost, setIsCurrentHost] = useState<boolean>(
    config.jam.isHost,
  );

  // Refs to access current values in useInput callback (avoids stale closure)
  const jamManagerRef = useRef<JamManager | null>(null);
  const jamParticipantsRef = useRef<JamParticipant[]>([]);
  const isCurrentHostRef = useRef<boolean>(config.jam.isHost);

  // Keep refs in sync with state
  useEffect(() => {
    jamManagerRef.current = jamManager;
  }, [jamManager]);
  useEffect(() => {
    jamParticipantsRef.current = jamParticipants;
  }, [jamParticipants]);
  useEffect(() => {
    isCurrentHostRef.current = isCurrentHost;
  }, [isCurrentHost]);

  const isJamMode = config.jam.enabled;
  const canControl = !isJamMode || isCurrentHost;

  // Non-blocking version check on startup
  useEffect(() => {
    checkForUpdates()
      .then((result) => {
        if (result.updateAvailable) {
          setUpdateAvailable(result.latestVersion);
        }
      })
      .catch(() => {}); // Silently ignore errors
  }, []);

  useEffect(() => {
    pomodoro.setOnTick((newState) => {
      setState(newState);
    });

    pomodoro.setOnSessionComplete(async (session) => {
      const sessionDuration = getSessionDuration(session, config.pomodoro);
      await history.addEntry(session, sessionDuration);
      setTodayStats(history.getTodayStats());

      const nextState = pomodoro.getState();
      if (nextState.currentSession === "work") {
        await music.play();
      } else {
        music.pause();
      }
      setMusicStatus(music.getStatusText());
      notifyUser();
    });

    // Initialize jam session if enabled
    if (config.jam.enabled) {
      const manager = new JamManager({
        pomodoro,
        isHost: config.jam.isHost,
        sessionCode: config.jam.sessionCode,
        participantName: config.jam.participantName,
        server: config.jam.server,
        onStateChange: () => setState(pomodoro.getState()),
        onParticipantsChange: (participants) =>
          setJamParticipants(participants),
        onConnectionChange: (connState) => setJamConnectionState(connState),
        onHostChange: (isHost) => setIsCurrentHost(isHost),
      });

      setJamManager(manager);
      setJamSessionCode(manager.getSessionCode());

      manager.connect().catch((err) => {
        console.error("Failed to connect to jam session:", err);
      });
    }

    return () => {
      music.cleanup();
      jamManager?.disconnect();
    };
  }, []);

  useInput((input, key) => {
    if (input === "q" || key.escape || (key.ctrl && input === "c")) {
      music.cleanup();
      jamManager?.disconnect();
      console.log(
        `\nGoodbye! You completed ${state.completedPomodoros} pomodoros.`,
      );
      exit();
    } else if (input === "s" && canControl) {
      pomodoro.start();
      jamManager?.sendControl("start");
      if (state.currentSession === "work") {
        music.play();
        setMusicStatus(music.getStatusText());
      }
    } else if (input === "p" && canControl) {
      pomodoro.pause();
      jamManager?.sendControl("pause");
    } else if (input === "r" && canControl) {
      pomodoro.reset();
      jamManager?.sendControl("reset");
    } else if (input === "n" && canControl) {
      pomodoro.skip();
      jamManager?.sendControl("skip");
    } else if (input === "m") {
      music.toggle();
      setMusicStatus(music.getStatusText());
    } else if (input === ">" || input === ".") {
      music.nextStation();
      setMusicStatus(music.getStatusText());
    } else if (/^[1-9]$/.test(input)) {
      // Host can transfer to another participant by pressing 1-9
      const manager = jamManagerRef.current;
      const participants = jamParticipantsRef.current;
      const amHost = isCurrentHostRef.current;

      if (amHost && manager) {
        const myId = manager.getParticipantId();
        const otherParticipants = participants.filter(
          (p) => p.id !== myId && !p.isHost,
        );
        const index = parseInt(input, 10) - 1;
        if (index < otherParticipants.length) {
          manager.transferHost(otherParticipants[index].id);
        }
      }
    }
  });

  const time = pomodoro.formatTime(state.timeRemaining);
  const session = state.currentSession;
  const color = getSessionColor(session);
  const label = getSessionLabel(session);
  const sessionDuration = getSessionDuration(session, config.pomodoro);
  const progress = (state.timeRemaining / (sessionDuration * 60)) * 100;
  const progressBarLength = 40;
  const filledLength = Math.round((progressBarLength * progress) / 100);
  const progressBar =
    "█".repeat(filledLength) + "░".repeat(progressBarLength - filledLength);

  // Connection state display
  const getConnectionDisplay = () => {
    switch (jamConnectionState) {
      case "connected":
        return { symbol: "●", color: "green", text: "Connected" };
      case "connecting":
        return { symbol: "○", color: "yellow", text: "Connecting..." };
      case "error":
        return { symbol: "●", color: "red", text: "Error" };
      default:
        return { symbol: "○", color: "gray", text: "Disconnected" };
    }
  };

  const connDisplay = getConnectionDisplay();

  // Render big ASCII timer
  const bigTimeLines = renderBigText(time);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
    >
      {updateAvailable && (
        <Box marginY={1} flexDirection="column" alignItems="center">
          <Text color="yellow">Update available: {updateAvailable}</Text>
          <Text color="gray">(run pomotui --update)</Text>
        </Box>
      )}
      <Box marginY={1}>
        <Text bold color={color}>
          [ {label} ]
        </Text>
      </Box>
      <Box marginY={1} flexDirection="column" alignItems="center">
        {bigTimeLines.map((line, i) => (
          <Text key={i} bold color="green">
            {line}
          </Text>
        ))}
      </Box>
      <Box marginY={1}>
        <Text color={color}>{progressBar}</Text>
      </Box>
      <Box marginY={1}>
        <Text color={state.isRunning ? "green" : "yellow"}>
          {state.isRunning ? "[ RUNNING ]" : "[ PAUSED ]"}
        </Text>
      </Box>

      {/* Jam Session Info */}
      {isJamMode && (
        <>
          <Box marginY={1} flexDirection="column" alignItems="center">
            <Text color="yellow" bold>
              JAM SESSION: {jamSessionCode}
            </Text>
            <Box>
              <Text color={connDisplay.color as any}>
                {connDisplay.symbol} {connDisplay.text}
              </Text>
            </Box>
          </Box>

          {jamParticipants.length > 0 && (
            <Box marginY={1} flexDirection="column" alignItems="center">
              <Text color="gray">Participants ({jamParticipants.length}):</Text>
              {(() => {
                const myId = jamManager?.getParticipantId();
                const otherParticipants = jamParticipants.filter(
                  (p) => p.id !== myId,
                );
                let transferIndex = 0;
                return jamParticipants.map((p) => {
                  const isMe = p.id === myId;
                  const canTransferTo = isCurrentHost && !p.isHost && !isMe;
                  const transferNum = canTransferTo ? ++transferIndex : 0;
                  return (
                    <Text key={p.id} color={isMe ? "cyan" : "white"}>
                      {p.isHost
                        ? "*"
                        : canTransferTo
                          ? `[${transferNum}]`
                          : "-"}{" "}
                      {p.name}
                      {p.isHost ? " (host)" : ""}
                      {isMe ? " (you)" : ""}
                    </Text>
                  );
                });
              })()}
            </Box>
          )}

          {!canControl && (
            <Box marginY={1}>
              <Text color="gray" dimColor>
                Only the host can control the timer
              </Text>
            </Box>
          )}

          {isCurrentHost && (
            <Box marginY={1}>
              <Text color="gray">Share: pomotui --join {jamSessionCode}</Text>
            </Box>
          )}
        </>
      )}

      {!isJamMode && (
        <Box marginY={1}>
          <Text color="gray">
            Today: {todayStats.pomodoros} pomodoros ({todayStats.totalMinutes}m)
          </Text>
        </Box>
      )}
      <Box marginY={1}>
        <Text color="gray">
          Work: {config.pomodoro.workDuration}m | Short:{" "}
          {config.pomodoro.shortBreakDuration}m | Long:{" "}
          {config.pomodoro.longBreakDuration}m
        </Text>
      </Box>
      <Box marginY={1}>
        <Text color="magenta">{musicStatus}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="green">
          {canControl
            ? `[S]tart [P]ause [R]eset [N]ext [Q]uit [M]usic [>]station`
            : `[Q]uit [M]usic [>]station`}
        </Text>
      </Box>
      {isCurrentHost && jamParticipants.length > 1 && (
        <Box>
          <Text color="green" dimColor>
            [1-9] transfer host
          </Text>
        </Box>
      )}
    </Box>
  );
}

const config = parseConfig();
if (config) {
  render(<PomodoroTUI config={config} />);
}
