export type SessionType = "work" | "shortBreak" | "longBreak";

export interface PomodoroConfig {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  pomodorosBeforeLongBreak: number;
}

export interface PomodoroState {
  currentSession: SessionType;
  timeRemaining: number; // in seconds
  isRunning: boolean;
  completedPomodoros: number;
}

export const DEFAULT_CONFIG: PomodoroConfig = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosBeforeLongBreak: 4,
};

export interface PomodoroHistoryEntry {
  id: string;
  sessionType: SessionType;
  duration: number; // in minutes
  completedAt: string; // ISO 8601 timestamp
  date: string; // YYYY-MM-DD for easy filtering
  pomodoroNumber: number; // nth pomodoro of the day
}

export interface PomodoroHistory {
  entries: PomodoroHistoryEntry[];
  totalPomodoros: number;
  lastUpdated: string;
}

export type GroupConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface GroupParticipant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}
