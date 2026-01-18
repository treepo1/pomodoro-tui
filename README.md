# Pomodoro Timer TUI

A terminal-based Pomodoro timer with lofi music integration, built with Bun, Ink, and React.

<img width="2866" height="1116" alt="image" src="https://github.com/user-attachments/assets/0d450da7-8067-4e39-8bbf-085dd76ed7f8" />


## Features

- Full-screen TUI with progress bar and session tracking
- Configurable work/break durations
- Lofi radio streaming during work sessions
- Collaborative jam sessions for real-time multiplayer pomodoro
- Session history saved to JSON (for Obsidian/tool integration)
- Cross-platform notification sounds

## Installation

### Quick Install (Recommended)

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/treepo1/pomodoro-tui/master/install.sh | bash
```

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/treepo1/pomodoro-tui/master/install.ps1 | iex
```

### Manual Installation

Download the latest release from [GitHub Releases](https://github.com/treepo1/pomodoro-tui/releases) and add it to your PATH.

### Build from Source

Requires [Bun](https://bun.sh/) runtime.

```bash
git clone https://github.com/treepo1/pomodoro-tui.git
cd pomodoro-tui
bun install
bun run build
```

## Requirements

- For music playback (optional): `mpv`

### Installing Audio Players (for music)

**Linux (Debian/Ubuntu):**
```bash
sudo apt install mpv
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

The app includes 8 curated radio stations:
- Lofi Girl
- ChillHop
- Box Lofi
- Lofi Cafe
- Study Beats
- Antena 1
- FM Sergipe
- Smooth Jazz


## Group Sessions

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
