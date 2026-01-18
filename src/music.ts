import type { Subprocess } from 'bun';

export interface MusicStatus {
  isPlaying: boolean;
  stationName: string;
  stationIndex: number;
  totalStations: number;
}

export interface LofiStation {
  name: string;
  url: string;
}

// Curated list of lofi radio streams
export const LOFI_STATIONS: LofiStation[] = [
  {
    name: 'Lofi Girl',
    url: 'https://play.streamafrica.net/lofiradio',
  },
  {
    name: 'ChillHop',
    url: 'https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/',
  },
  {
    name: 'Box Lofi',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
  },
  {
    name: 'Lofi Cafe',
    url: 'https://stream.zeno.fm/0r0xa792kwzuv',
  },
  {
    name: 'Study Beats',
    url: 'https://stream.zeno.fm/yn65fsaurfhvv',
  },
  {
    name: 'Antena 1',
    url: 'https://radio.garden/api/ara/content/listen/Q6JROd6G/channel.mp3',
  },
  {
    name: 'FM Sergipe',
    url: 'https://radio.garden/api/ara/content/listen/EQzCDHL3/channel.mp3',
  },
  {
    name: 'Smooth Jazz',
    url: 'https://radio.garden/api/ara/content/listen/1vlrqH6v/channel.mp3',
  },
];

export class RadioPlayer {
  private process: Subprocess | null = null;
  private currentStationIndex: number = 0;
  private isPlaying: boolean = false;
  private playerCommand: string | null = null;

  constructor() {
    this.detectPlayer();
  }

  private detectPlayer(): void {
    // Try to find an available audio player
    const players = ['mpv', 'ffplay', 'cvlc', 'mplayer'];
    // Use 'where' on Windows, 'which' on Unix-like systems
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';

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
        stdin: 'ignore',
        stdout: 'ignore',
        stderr: 'ignore',
      });
      this.isPlaying = true;
      return true;
    } catch {
      return false;
    }
  }

  private getPlayerArgs(url: string): string[] {
    switch (this.playerCommand) {
      case 'mpv':
        return ['--no-video', '--really-quiet', url];
      case 'ffplay':
        return ['-nodisp', '-autoexit', '-loglevel', 'quiet', url];
      case 'cvlc':
        return ['--intf', 'dummy', '--quiet', url];
      case 'mplayer':
        return ['-really-quiet', '-noconsolecontrols', url];
      default:
        return [url];
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isPlaying = false;
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
    this.currentStationIndex = (this.currentStationIndex + 1) % LOFI_STATIONS.length;
    if (wasPlaying) {
      this.play();
    }
  }

  previousStation(): void {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentStationIndex = (this.currentStationIndex - 1 + LOFI_STATIONS.length) % LOFI_STATIONS.length;
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
    };
  }

  getCurrentStation(): LofiStation {
    return LOFI_STATIONS[this.currentStationIndex];
  }

  getStations(): LofiStation[] {
    return [...LOFI_STATIONS];
  }
}

export type MusicMode = 'radio' | 'off';

export class MusicManager {
  private mode: MusicMode;
  private radio: RadioPlayer;

  constructor(mode: MusicMode = 'radio') {
    this.mode = mode;
    this.radio = new RadioPlayer();
  }

  async play(): Promise<boolean> {
    if (this.mode === 'off') return false;
    return this.radio.play();
  }

  stop(): void {
    if (this.mode === 'radio') {
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
    if (this.mode === 'radio') {
      return this.radio.toggle();
    }
    return false;
  }

  nextStation(): void {
    if (this.mode === 'radio') {
      this.radio.nextStation();
    }
  }

  getStatusText(): string {
    if (this.mode === 'off') {
      return 'Music: Off';
    }

    // Radio mode
    const status = this.radio.getStatus();
    const icon = status.isPlaying ? '♪' : '♪';
    const state = status.isPlaying ? '' : ' (paused)';
    return `${icon} ${status.stationName}${state}`;
  }

  getMode(): MusicMode {
    return this.mode;
  }

  isPlaying(): boolean {
    if (this.mode === 'radio') {
      return this.radio.getStatus().isPlaying;
    }
    return false;
  }

  hasPlayer(): boolean {
    if (this.mode === 'radio') {
      return this.radio.getAvailablePlayer() !== null;
    }
    return true;
  }

  cleanup(): void {
    this.radio.stop();
  }
}
