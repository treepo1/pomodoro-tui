import type { Subprocess } from "bun";
import { existsSync, unlinkSync } from "fs";
import { connect } from "net";
import { tmpdir } from "os";
import { join } from "path";

export interface MusicStatus {
  isPlaying: boolean;
  stationName: string;
  stationIndex: number;
  totalStations: number;
  volume: number;
}

export interface LofiStation {
  name: string;
  url: string;
  icon: string;
}

// Curated list of lofi radio streams
export const LOFI_STATIONS: LofiStation[] = [
  {
    name: "Lofi Girl",
    url: "https://play.streamafrica.net/lofiradio",
    icon: "🎧",
  },
  {
    name: "ChillHop",
    url: "https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/",
    icon: "🐰",
  },
  {
    name: "Box Lofi",
    url: "https://stream.zeno.fm/f3wvbbqmdg8uv",
    icon: "📦",
  },
  {
    name: "Lofi Cafe",
    url: "https://stream.zeno.fm/0r0xa792kwzuv",
    icon: "☕",
  },
  {
    name: "Study Beats",
    url: "https://stream.zeno.fm/yn65fsaurfhvv",
    icon: "📚",
  },
  {
    name: "Antena 1",
    url: "https://radio.garden/api/ara/content/listen/Q6JROd6G/channel.mp3",
    icon: "📡",
  },
  {
    name: "FM Sergipe",
    url: "https://radio.garden/api/ara/content/listen/EQzCDHL3/channel.mp3",
    icon: "🌴",
  },
  {
    name: "Smooth Jazz",
    url: "https://radio.garden/api/ara/content/listen/1vlrqH6v/channel.mp3",
    icon: "🎷",
  },
];

export class RadioPlayer {
  private process: Subprocess | null = null;
  private currentStationIndex: number = 0;
  private isPlaying: boolean = false;
  private playerCommand: string | null = null;
  private volume: number = 50;
  private mpvSocketPath: string;

  constructor(initialVolume: number = 50, initialStationIndex: number = 0) {
    this.volume = Math.max(0, Math.min(100, initialVolume));
    this.currentStationIndex = Math.max(0, Math.min(LOFI_STATIONS.length - 1, initialStationIndex));
    // Windows uses named pipes, Unix uses socket files
    if (process.platform === "win32") {
      this.mpvSocketPath = `\\\\.\\pipe\\pomotui-mpv-${process.pid}`;
    } else {
      this.mpvSocketPath = join(tmpdir(), `pomotui-mpv-${process.pid}.sock`);
    }
    this.detectPlayer();
  }

  private detectPlayer(): void {
    // Try to find an available audio player
    const players = ["mpv"];
    // Use 'where' on Windows, 'which' on Unix-like systems
    const whichCommand = process.platform === "win32" ? "where" : "which";

    for (const player of players) {
      try {
        const result = Bun.spawnSync([whichCommand, player]);
        if (result.exitCode === 0) {
          this.playerCommand = player;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  getAvailablePlayer(): string | null {
    return this.playerCommand;
  }

  async play(): Promise<boolean> {
    if (!this.playerCommand) {
      return false;
    }

    if (this.isPlaying) {
      return true;
    }

    const station = LOFI_STATIONS[this.currentStationIndex];

    try {
      const args = this.getPlayerArgs(station.url);
      this.process = Bun.spawn([this.playerCommand, ...args], {
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      });
      this.isPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  private getPlayerArgs(url: string): string[] {
    return [
      "--no-video",
      "--really-quiet",
      `--volume=${this.volume}`,
      `--input-ipc-server=${this.mpvSocketPath}`,
      url,
    ];
  }

  private sendMpvCommand(command: unknown[]): void {
    if (!this.isPlaying) return;
    // On Windows, named pipes don't exist as files, so skip the existsSync check
    if (process.platform !== "win32" && !existsSync(this.mpvSocketPath)) return;

    try {
      const socket = connect(this.mpvSocketPath);
      const message = JSON.stringify({ command }) + "\n";
      socket.write(message);
      socket.end();
    } catch {
      // Socket connection failed, ignore
    }
  }

  private cleanupSocket(): void {
    // Windows named pipes are automatically cleaned up, no need to unlink
    if (process.platform === "win32") return;

    try {
      if (existsSync(this.mpvSocketPath)) {
        unlinkSync(this.mpvSocketPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isPlaying = false;
    this.cleanupSocket();
  }

  pause(): void {
    this.stop();
  }

  async resume(): Promise<boolean> {
    return this.play();
  }

  async toggle(): Promise<boolean> {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      return this.play();
    }
  }

  nextStation(): void {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentStationIndex =
      (this.currentStationIndex + 1) % LOFI_STATIONS.length;
    if (wasPlaying) {
      this.play();
    }
  }

  previousStation(): void {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentStationIndex =
      (this.currentStationIndex - 1 + LOFI_STATIONS.length) %
      LOFI_STATIONS.length;
    if (wasPlaying) {
      this.play();
    }
  }

  setStation(index: number): void {
    if (index >= 0 && index < LOFI_STATIONS.length) {
      const wasPlaying = this.isPlaying;
      this.stop();
      this.currentStationIndex = index;
      if (wasPlaying) {
        this.play();
      }
    }
  }

  getStatus(): MusicStatus {
    const station = LOFI_STATIONS[this.currentStationIndex];
    return {
      isPlaying: this.isPlaying,
      stationName: station.name,
      stationIndex: this.currentStationIndex,
      totalStations: LOFI_STATIONS.length,
      volume: this.volume,
    };
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(level: number): void {
    const newVolume = Math.max(0, Math.min(100, level));
    if (newVolume === this.volume) return;

    this.volume = newVolume;

    // Use IPC to change volume without restart
    if (this.isPlaying) {
      this.sendMpvCommand(["set_property", "volume", this.volume]);
    }
  }

  volumeUp(step: number = 10): void {
    this.setVolume(this.volume + step);
  }

  volumeDown(step: number = 10): void {
    this.setVolume(this.volume - step);
  }

  getCurrentStation(): LofiStation {
    return LOFI_STATIONS[this.currentStationIndex];
  }

  getStations(): LofiStation[] {
    return [...LOFI_STATIONS];
  }
}

export type MusicMode = "radio" | "off";

export class MusicManager {
  private mode: MusicMode;
  private radio: RadioPlayer;

  constructor(mode: MusicMode = "radio", initialVolume: number = 50, initialStationIndex: number = 0) {
    this.mode = mode;
    this.radio = new RadioPlayer(initialVolume, initialStationIndex);
  }

  async play(): Promise<boolean> {
    if (this.mode === "off") return false;
    return this.radio.play();
  }

  stop(): void {
    if (this.mode === "radio") {
      this.radio.stop();
    }
  }

  pause(): void {
    this.stop();
  }

  async resume(): Promise<boolean> {
    return this.play();
  }

  async toggle(): Promise<boolean> {
    if (this.mode === "radio") {
      return this.radio.toggle();
    }
    return false;
  }

  nextStation(): void {
    if (this.mode === "radio") {
      this.radio.nextStation();
    }
  }

  getStatusText(): string {
    if (this.mode === "off") {
      return "Music: Off";
    }

    // Radio mode
    const status = this.radio.getStatus();
    const station = this.radio.getCurrentStation();
    const playIcon = status.isPlaying ? "▶" : "⏸";
    const state = status.isPlaying ? "" : " (paused)";
    return `${station.icon} ${playIcon} ${status.stationName}${state} [${status.volume}%]`;
  }

  getMode(): MusicMode {
    return this.mode;
  }

  isPlaying(): boolean {
    if (this.mode === "radio") {
      return this.radio.getStatus().isPlaying;
    }
    return false;
  }

  hasPlayer(): boolean {
    if (this.mode === "radio") {
      return this.radio.getAvailablePlayer() !== null;
    }
    return true;
  }

  getVolume(): number {
    return this.radio.getVolume();
  }

  setVolume(level: number): void {
    this.radio.setVolume(level);
  }

  getStationIndex(): number {
    return this.radio.getStatus().stationIndex;
  }

  volumeUp(step: number = 10): void {
    this.radio.volumeUp(step);
  }

  volumeDown(step: number = 10): void {
    this.radio.volumeDown(step);
  }

  cleanup(): void {
    this.radio.stop();
  }
}
