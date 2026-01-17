# Pomodoro Timer TUI

A terminal-based Pomodoro timer with lofi music integration, built with Bun and blessed.

## Features

- Full-screen TUI with progress bar and session tracking
- Configurable work/break durations
- Lofi radio streaming during work sessions
- Optional Spotify "now playing" display
- Session history saved to JSON (for Obsidian/tool integration)
- Cross-platform notification sounds

## Requirements

- [Bun](https://bun.sh/) runtime
- For music playback (optional): `mpv`, `ffplay`, `cvlc`, or `mplayer`

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
| `--music <mode>` | `-m` | Music mode: radio, spotify, off | radio |
| `--spotify-token` | | Spotify access token | |
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

### Spotify Integration

To display your currently playing Spotify track:

1. Get a Spotify access token from [Spotify Developer Dashboard](https://developer.spotify.com/)
2. Run with the token:
```bash
bun run start -m spotify --spotify-token YOUR_TOKEN
```

Note: This only displays the current track; it doesn't control playback.

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
