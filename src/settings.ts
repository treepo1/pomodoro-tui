import { homedir } from 'os';
import { join } from 'path';

interface MusicSettings {
  stationIndex: number;
  isPlaying: boolean;
  volume: number;
}

interface Settings {
  userName: string;
  music: MusicSettings;
}

const DEFAULT_SETTINGS_PATH = join(homedir(), '.pomotui-settings.json');

const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  stationIndex: 0,
  isPlaying: false,
  volume: 50,
};

const DEFAULT_SETTINGS: Settings = {
  userName: 'User',
  music: DEFAULT_MUSIC_SETTINGS,
};

export class SettingsManager {
  private settings: Settings;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || DEFAULT_SETTINGS_PATH;
    this.settings = this.load();
  }

  private load(): Settings {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.filePath)) {
        return { ...DEFAULT_SETTINGS, music: { ...DEFAULT_MUSIC_SETTINGS } };
      }
      const file = Bun.file(this.filePath);
      if (file.size === 0) {
        return { ...DEFAULT_SETTINGS, music: { ...DEFAULT_MUSIC_SETTINGS } };
      }
      const content = require(this.filePath);
      return {
        ...DEFAULT_SETTINGS,
        ...content,
        music: { ...DEFAULT_MUSIC_SETTINGS, ...content.music },
      };
    } catch {
      return { ...DEFAULT_SETTINGS, music: { ...DEFAULT_MUSIC_SETTINGS } };
    }
  }

  private async save(): Promise<void> {
    await Bun.write(this.filePath, JSON.stringify(this.settings, null, 2));
  }

  getUserName(): string {
    return this.settings.userName;
  }

  setUserName(name: string): void {
    this.settings.userName = name;
    this.save();
  }

  getMusicSettings(): MusicSettings {
    return this.settings.music;
  }

  setMusicSettings(music: Partial<MusicSettings>): void {
    this.settings.music = { ...this.settings.music, ...music };
    this.save();
  }

  getMusicStationIndex(): number {
    return this.settings.music.stationIndex;
  }

  setMusicStationIndex(index: number): void {
    this.settings.music.stationIndex = index;
    this.save();
  }

  getMusicIsPlaying(): boolean {
    return this.settings.music.isPlaying;
  }

  setMusicIsPlaying(isPlaying: boolean): void {
    this.settings.music.isPlaying = isPlaying;
    this.save();
  }

  getMusicVolume(): number {
    return this.settings.music.volume;
  }

  setMusicVolume(volume: number): void {
    this.settings.music.volume = volume;
    this.save();
  }
}
