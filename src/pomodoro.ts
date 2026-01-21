import { PomodoroConfig, PomodoroState, SessionType, DEFAULT_CONFIG } from './types';

export class Pomodoro {
  private config: PomodoroConfig;
  private state: PomodoroState;
  private timer: NodeJS.Timeout | null = null;
  private onTick: ((state: PomodoroState) => void) | null = null;
  private onSessionComplete: ((session: SessionType) => void) | null = null;
  private jamMode: boolean = false;

  constructor(config: Partial<PomodoroConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      currentSession: 'work',
      timeRemaining: this.config.workDuration * 60,
      isRunning: false,
      completedPomodoros: 0,
    };
  }

  setOnTick(callback: (state: PomodoroState) => void): void {
    this.onTick = callback;
  }

  setOnSessionComplete(callback: (session: SessionType) => void): void {
    this.onSessionComplete = callback;
  }

  getState(): PomodoroState {
    return { ...this.state };
  }

  getConfig(): PomodoroConfig {
    return { ...this.config };
  }

  // Set jam mode - when enabled, prevents local timer ticks (participant mode)
  setJamMode(enabled: boolean): void {
    this.jamMode = enabled;
  }

  isJamMode(): boolean {
    return this.jamMode;
  }

  // Apply external state (for jam session participants receiving host state)
  setState(newState: PomodoroState): void {
    const wasRunning = this.state.isRunning;
    const nowRunning = newState.isRunning;

    this.state = { ...newState };

    // Handle timer sync for participants
    if (this.jamMode) {
      // In jam mode (participant), we don't run our own timer
      // Just apply the state from the host
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }

    this.onTick?.(this.getState());
  }

  start(): void {
    if (this.state.isRunning) return;

    this.state.isRunning = true;
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
    this.onTick?.(this.getState());
  }

  pause(): void {
    if (!this.state.isRunning) return;

    this.state.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onTick?.(this.getState());
  }

  // Clean shutdown - stops timer and clears all callbacks
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.isRunning = false;
    this.onTick = null;
    this.onSessionComplete = null;
  }

  reset(): void {
    this.pause();
    this.state.timeRemaining = this.getSessionDuration(this.state.currentSession) * 60;
    this.onTick?.(this.getState());
  }

  skip(): void {
    // Stop the timer first to prevent any race conditions
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state.isRunning = false;
    this.completeSession();
  }

  private tick(): void {
    this.state.timeRemaining--;

    if (this.state.timeRemaining <= 0) {
      this.completeSession();
    }

    this.onTick?.(this.getState());
  }

  private completeSession(): void {
    const completedSession = this.state.currentSession;
    this.onSessionComplete?.(completedSession);

    if (completedSession === 'work') {
      this.state.completedPomodoros++;

      if (this.state.completedPomodoros % this.config.pomodorosBeforeLongBreak === 0) {
        this.state.currentSession = 'longBreak';
      } else {
        this.state.currentSession = 'shortBreak';
      }
    } else {
      this.state.currentSession = 'work';
    }

    this.state.timeRemaining = this.getSessionDuration(this.state.currentSession) * 60;
    this.state.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.onTick?.(this.getState());
  }

  private getSessionDuration(session: SessionType): number {
    switch (session) {
      case 'work':
        return this.config.workDuration;
      case 'shortBreak':
        return this.config.shortBreakDuration;
      case 'longBreak':
        return this.config.longBreakDuration;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getSessionLabel(session: SessionType): string {
    switch (session) {
      case 'work':
        return 'Work';
      case 'shortBreak':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
    }
  }
}
