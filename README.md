# Pomodoro Timer TUI

A terminal-based Pomodoro timer with lofi music integration, built with Bun, Ink, and React.

## Features

- Full-screen TUI with progress bar and session tracking
- Configurable work/break durations
- Lofi radio streaming during work sessions
- Collaborative jam sessions for real-time multiplayer pomodoro
- Session history saved to JSON (for Obsidian/tool integration)
- Cross-platform notification sounds

## Requirements

- [Bun](https://bun.sh/) runtime (for development)
- For music playback (optional): `mpv`, `ffplay`, `cvlc`, or `mplayer`
- **Note**: The compiled executable does not require Bun to be installed

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd pomodoro-app

# Install dependencies
bun install
```

### Installing Audio Players (for music)

**Linux (Debian/Ubuntu):**
```bash
sudo apt install mpv
# or
sudo apt install ffmpeg  # includes ffplay
# or
sudo apt install vlc
```

**macOS:**
```bash
brew install mpv
```

**Windows:**
```bash
# Install mpv from https://mpv.io/installation/
# Or use winget:
winget install mpv
```

## Building a Standalone Executable

You can build a single-file executable that includes the Bun runtime and all dependencies:

```bash
bun run build
```

This creates a `pomotui` executable that can be distributed and run without requiring Bun to be installed:

```bash
# Run the executable directly
./pomotui

# With options
./pomotui --work 50 --short 10
```

The executable is platform-specific:
- Built on macOS → runs on macOS
- Built on Linux → runs on Linux
- Built on Windows → runs on Windows

To distribute to multiple platforms, build on each target platform or use cross-compilation tools.

## Usage

```bash
# Start with default settings (25/5/15 minute sessions)
bun run start

# Custom durations
bun run start -w 50 -s 10 -l 30

# Disable music
bun run start -m off

# Custom history file (for Obsidian integration)
bun run start -d ~/obsidian/pomodoro.json
```

## CLI Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--work <min>` | `-w` | Work session duration | 25 |
| `--short <min>` | `-s` | Short break duration | 5 |
| `--long <min>` | `-l` | Long break duration | 15 |
| `--cycles <n>` | `-c` | Pomodoros before long break | 4 |
| `--data <path>` | `-d` | History file path | ~/.pomodoro/history.json |
| `--music <mode>` | `-m` | Music mode: radio, off | radio |
| `--host` | | Host a jam session | |
| `--join <code>` | | Join a jam session | |
| `--name <name>` | | Your name in jam sessions | User |
| `--help` | `-h` | Show help | |

## Keyboard Controls

| Key | Action |
|-----|--------|
| `s` | Start timer |
| `p` | Pause timer |
| `r` | Reset current session |
| `n` | Skip to next session |
| `m` | Toggle music on/off |
| `>` or `.` | Next radio station |
| `q` | Quit |

## Music

### Lofi Radio (Default)

The app includes 5 curated lofi radio stations:
- Lofi Girl
- ChillHop
- Box Lofi
- Lofi Cafe
- Study Beats

Music automatically plays during work sessions and pauses during breaks.

## Jam Sessions

Work together with friends in real-time collaborative pomodoro sessions:

```bash
# Host a session
pomotui --host --name "Alice"
# Output shows: JAM SESSION: XYZ234

# Join a session (on another computer)
pomotui --join XYZ234 --name "Bob"
```

Features:
- Real-time timer sync across all participants
- Host controls the timer (start/pause/reset/skip)
- Automatic host transfer when host leaves
- Manual host transfer via `[1-9]` keys

## History File

Completed sessions are saved to `~/.pomodoro/history.json`:

```json
{
  "entries": [
    {
      "id": "1705500000000-abc1234",
      "sessionType": "work",
      "duration": 25,
      "completedAt": "2024-01-17T10:00:00.000Z",
      "date": "2024-01-17",
      "pomodoroNumber": 1
    }
  ],
  "totalPomodoros": 1,
  "lastUpdated": "2024-01-17T10:00:00.000Z"
}
```

### Obsidian Integration

Point the history file to your Obsidian vault:

```bash
bun run start -d ~/obsidian/pomodoro-data.json
```

You can then create Obsidian templates or dataview queries to visualize your pomodoro data.

## Development

```bash
# Run in watch mode
bun run dev

# Type check
bun run tsc --noEmit
```

## License

MIT
