import blessed from 'blessed';
import { parseArgs } from 'util';
import { Pomodoro } from './pomodoro';
import type { PomodoroConfig, PomodoroState, SessionType } from './types';
import { DEFAULT_CONFIG } from './types';

function showHelp(): void {
  console.log(`
Pomodoro Timer - A TUI pomodoro timer

Usage: bun run start [options]

Options:
  -w, --work <minutes>     Work session duration (default: ${DEFAULT_CONFIG.workDuration})
  -s, --short <minutes>    Short break duration (default: ${DEFAULT_CONFIG.shortBreakDuration})
  -l, --long <minutes>     Long break duration (default: ${DEFAULT_CONFIG.longBreakDuration})
  -c, --cycles <number>    Pomodoros before long break (default: ${DEFAULT_CONFIG.pomodorosBeforeLongBreak})
  -h, --help               Show this help message

Examples:
  bun run start                     # Use default durations (25/5/15)
  bun run start -w 50 -s 10 -l 30   # 50min work, 10min short, 30min long
  bun run start --work 45           # 45min work sessions

Controls:
  [s] Start    [p] Pause    [r] Reset    [n] Next    [q] Quit
`);
}

function parseConfig(): PomodoroConfig | null {
  try {
    const { values } = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        work: { type: 'string', short: 'w' },
        short: { type: 'string', short: 's' },
        long: { type: 'string', short: 'l' },
        cycles: { type: 'string', short: 'c' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
    });

    if (values.help) {
      showHelp();
      return null;
    }

    const config: PomodoroConfig = { ...DEFAULT_CONFIG };

    if (values.work) {
      const work = parseInt(values.work, 10);
      if (isNaN(work) || work < 1) {
        console.error('Error: Work duration must be a positive number');
        process.exit(1);
      }
      config.workDuration = work;
    }

    if (values.short) {
      const short = parseInt(values.short, 10);
      if (isNaN(short) || short < 1) {
        console.error('Error: Short break duration must be a positive number');
        process.exit(1);
      }
      config.shortBreakDuration = short;
    }

    if (values.long) {
      const long = parseInt(values.long, 10);
      if (isNaN(long) || long < 1) {
        console.error('Error: Long break duration must be a positive number');
        process.exit(1);
      }
      config.longBreakDuration = long;
    }

    if (values.cycles) {
      const cycles = parseInt(values.cycles, 10);
      if (isNaN(cycles) || cycles < 1) {
        console.error('Error: Cycles must be a positive number');
        process.exit(1);
      }
      config.pomodorosBeforeLongBreak = cycles;
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    console.error('Use --help for usage information');
    process.exit(1);
  }
}

class PomodoroTUI {
  private pomodoro: Pomodoro;
  private screen: blessed.Widgets.Screen;
  private timerBox: blessed.Widgets.BoxElement;
  private sessionBox: blessed.Widgets.BoxElement;
  private progressBar: blessed.Widgets.ProgressBarElement;
  private statsBox: blessed.Widgets.BoxElement;
  private statusBox: blessed.Widgets.BoxElement;
  private configBox: blessed.Widgets.BoxElement;

  constructor(config: PomodoroConfig) {
    this.pomodoro = new Pomodoro(config);

    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Pomodoro Timer',
    });

    // Create main container
    const mainBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 50,
      height: 20,
      border: {
        type: 'line',
      },
      style: {
        border: {
          fg: 'cyan',
        },
      },
    });

    // Title
    blessed.box({
      parent: mainBox,
      top: 0,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: ' POMODORO TIMER ',
      style: {
        fg: 'white',
        bold: true,
      },
    });

    // Session type display
    this.sessionBox = blessed.box({
      parent: mainBox,
      top: 2,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: 'WORK',
      style: {
        fg: 'red',
        bold: true,
      },
    });

    // Timer display
    const initialTime = this.pomodoro.formatTime(this.pomodoro.getState().timeRemaining);
    this.timerBox = blessed.box({
      parent: mainBox,
      top: 4,
      left: 'center',
      width: 'shrink',
      height: 3,
      content: this.getLargeTime(initialTime),
      style: {
        fg: 'white',
        bold: true,
      },
    });

    // Progress bar
    this.progressBar = blessed.progressbar({
      parent: mainBox,
      top: 8,
      left: 2,
      width: 44,
      height: 1,
      orientation: 'horizontal',
      filled: 100,
      style: {
        bar: {
          bg: 'red',
        },
      },
      ch: '█',
    });

    // Status display (Running/Paused)
    this.statusBox = blessed.box({
      parent: mainBox,
      top: 10,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '[ PAUSED ]',
      style: {
        fg: 'yellow',
      },
    });

    // Stats display
    this.statsBox = blessed.box({
      parent: mainBox,
      top: 12,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: 'Completed: 0 pomodoros',
      style: {
        fg: 'gray',
      },
    });

    // Config display
    const cfg = this.pomodoro.getConfig();
    this.configBox = blessed.box({
      parent: mainBox,
      top: 14,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: `Work: ${cfg.workDuration}m | Short: ${cfg.shortBreakDuration}m | Long: ${cfg.longBreakDuration}m`,
      style: {
        fg: 'gray',
      },
    });

    // Controls help
    blessed.box({
      parent: mainBox,
      top: 16,
      left: 'center',
      width: 'shrink',
      height: 1,
      content: '[s]tart [p]ause [r]eset [n]ext [q]uit',
      style: {
        fg: 'cyan',
      },
    });

    this.setupCallbacks();
    this.setupKeyBindings();
  }

  private getLargeTime(time: string): string {
    return `     ${time}     `;
  }

  private getSessionColor(session: SessionType): string {
    switch (session) {
      case 'work':
        return 'red';
      case 'shortBreak':
        return 'green';
      case 'longBreak':
        return 'blue';
    }
  }

  private getSessionLabel(session: SessionType): string {
    switch (session) {
      case 'work':
        return 'WORK';
      case 'shortBreak':
        return 'SHORT BREAK';
      case 'longBreak':
        return 'LONG BREAK';
    }
  }

  private setupCallbacks(): void {
    this.pomodoro.setOnTick((state) => this.render(state));
    this.pomodoro.setOnSessionComplete((session) => this.onSessionComplete(session));
  }

  private setupKeyBindings(): void {
    // Quit
    this.screen.key(['q', 'C-c', 'escape'], () => {
      const state = this.pomodoro.getState();
      this.screen.destroy();
      console.log(`\nGoodbye! You completed ${state.completedPomodoros} pomodoros.`);
      process.exit(0);
    });

    // Start
    this.screen.key(['s'], () => {
      this.pomodoro.start();
    });

    // Pause
    this.screen.key(['p'], () => {
      this.pomodoro.pause();
      this.render(this.pomodoro.getState());
    });

    // Reset
    this.screen.key(['r'], () => {
      this.pomodoro.reset();
    });

    // Next/Skip
    this.screen.key(['n'], () => {
      this.pomodoro.skip();
    });
  }

  private render(state: PomodoroState): void {
    const time = this.pomodoro.formatTime(state.timeRemaining);
    const session = state.currentSession;
    const color = this.getSessionColor(session);
    const config = this.pomodoro.getConfig();

    // Update timer
    this.timerBox.setContent(this.getLargeTime(time));

    // Update session label and color
    this.sessionBox.setContent(this.getSessionLabel(session));
    this.sessionBox.style.fg = color;

    // Update progress bar
    const sessionDuration = this.getSessionDuration(session, config);
    const progress = (state.timeRemaining / (sessionDuration * 60)) * 100;
    this.progressBar.setProgress(progress);
    (this.progressBar.style.bar as any).bg = color;

    // Update status
    this.statusBox.setContent(state.isRunning ? '[ RUNNING ]' : '[ PAUSED ]');
    this.statusBox.style.fg = state.isRunning ? 'green' : 'yellow';

    // Update stats
    this.statsBox.setContent(`Completed: ${state.completedPomodoros} pomodoros`);

    // Update screen title
    this.screen.title = `${time} - ${this.getSessionLabel(session)}`;

    this.screen.render();
  }

  private getSessionDuration(session: SessionType, config: PomodoroConfig): number {
    switch (session) {
      case 'work':
        return config.workDuration;
      case 'shortBreak':
        return config.shortBreakDuration;
      case 'longBreak':
        return config.longBreakDuration;
    }
  }

  private onSessionComplete(_session: SessionType): void {
    this.notifyUser();
  }

  private notifyUser(): void {
    // Terminal bell
    this.screen.program.bell();

    // Play notification sound based on platform
    const platform = process.platform;
    let command: string;

    if (platform === 'darwin') {
      command = 'afplay /System/Library/Sounds/Glass.aiff';
    } else if (platform === 'win32') {
      command = 'powershell -c "(New-Object Media.SoundPlayer \'C:\\Windows\\Media\\notify.wav\').PlaySync()"';
    } else {
      command = 'paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || aplay /usr/share/sounds/alsa/Front_Center.wav 2>/dev/null || true';
    }

    Bun.spawn(['sh', '-c', command], { stdout: 'ignore', stderr: 'ignore' });
  }

  run(): void {
    this.render(this.pomodoro.getState());
    this.screen.render();
  }
}

// Main
const config = parseConfig();
if (config) {
  const app = new PomodoroTUI(config);
  app.run();
}
