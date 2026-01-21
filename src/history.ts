import { homedir } from 'os';
import { join } from 'path';
import type { PomodoroHistory, PomodoroHistoryEntry, SessionType } from './types';

const DEFAULT_HISTORY_PATH = join(homedir(), '.pomodoro', 'history.json');

export class HistoryManager {
  private filePath: string;
  private history: PomodoroHistory;

  constructor(filePath?: string) {
    this.filePath = filePath || DEFAULT_HISTORY_PATH;
    this.history = this.load();
  }

  private load(): PomodoroHistory {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.filePath)) {
        return this.createEmpty();
      }
      const file = Bun.file(this.filePath);
      if (file.size === 0) {
        return this.createEmpty();
      }
      const content = require(this.filePath);
      return content as PomodoroHistory;
    } catch {
      return this.createEmpty();
    }
  }

  private createEmpty(): PomodoroHistory {
    return {
      entries: [],
      totalPomodoros: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async ensureDirectory(): Promise<void> {
    const dir = this.filePath.substring(0, this.filePath.lastIndexOf('/'));
    try {
      await Bun.write(join(dir, '.keep'), '');
    } catch {
      // Directory might already exist
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getPomodoroNumberForToday(): number {
    const today = this.getDateString(new Date());
    const todayEntries = this.history.entries.filter(
      (e) => e.date === today && e.sessionType === 'work'
    );
    return todayEntries.length + 1;
  }

  async addEntry(sessionType: SessionType, duration: number): Promise<PomodoroHistoryEntry> {
    const now = new Date();
    const entry: PomodoroHistoryEntry = {
      id: this.generateId(),
      sessionType,
      duration,
      completedAt: now.toISOString(),
      date: this.getDateString(now),
      pomodoroNumber: sessionType === 'work' ? this.getPomodoroNumberForToday() : 0,
    };

    this.history.entries.push(entry);
    if (sessionType === 'work') {
      this.history.totalPomodoros++;
    }
    this.history.lastUpdated = now.toISOString();

    await this.save();
    return entry;
  }

  private async save(): Promise<void> {
    await this.ensureDirectory();
    await Bun.write(this.filePath, JSON.stringify(this.history, null, 2));
  }

  getHistory(): PomodoroHistory {
    return { ...this.history };
  }

  getTodayStats(): { pomodoros: number; totalMinutes: number } {
    const today = this.getDateString(new Date());
    const todayEntries = this.history.entries.filter(
      (e) => e.date === today && e.sessionType === 'work'
    );
    return {
      pomodoros: todayEntries.length,
      totalMinutes: todayEntries.reduce((sum, e) => sum + e.duration, 0),
    };
  }

  // Get stats for last N days
  private getStatsForDateRange(startDate: Date, endDate: Date): { pomodoros: number; totalMinutes: number } {
    const start = this.getDateString(startDate);
    const end = this.getDateString(endDate);
    const entries = this.history.entries.filter(
      (e) => e.date >= start && e.date <= end && e.sessionType === 'work'
    );
    return {
      pomodoros: entries.length,
      totalMinutes: entries.reduce((sum, e) => sum + e.duration, 0),
    };
  }

  // Get stats for this week (Monday to Sunday)
  getWeekStats(): { pomodoros: number; totalMinutes: number } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return this.getStatsForDateRange(monday, now);
  }

  // Get stats for this month
  getMonthStats(): { pomodoros: number; totalMinutes: number } {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.getStatsForDateRange(firstOfMonth, now);
  }

  // Get all-time stats
  getAllTimeStats(): { pomodoros: number; totalMinutes: number; totalDays: number } {
    const workEntries = this.history.entries.filter((e) => e.sessionType === 'work');
    const uniqueDays = new Set(workEntries.map((e) => e.date));
    return {
      pomodoros: this.history.totalPomodoros,
      totalMinutes: workEntries.reduce((sum, e) => sum + e.duration, 0),
      totalDays: uniqueDays.size,
    };
  }

  // Get daily pomodoro counts for last N days (for chart)
  getDailyStats(days: number): Array<{ date: string; dayLabel: string; pomodoros: number; minutes: number }> {
    const result: Array<{ date: string; dayLabel: string; pomodoros: number; minutes: number }> = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = this.getDateString(date);
      const dayLabel = dayNames[date.getDay()];
      
      const dayEntries = this.history.entries.filter(
        (e) => e.date === dateStr && e.sessionType === 'work'
      );
      
      result.push({
        date: dateStr,
        dayLabel,
        pomodoros: dayEntries.length,
        minutes: dayEntries.reduce((sum, e) => sum + e.duration, 0),
      });
    }
    
    return result;
  }

  // Get average pomodoros per day
  getAveragePomodoros(): number {
    const allTime = this.getAllTimeStats();
    if (allTime.totalDays === 0) return 0;
    return Math.round((allTime.pomodoros / allTime.totalDays) * 10) / 10;
  }

  // Get streak (consecutive days with at least 1 pomodoro)
  getCurrentStreak(): number {
    const workEntries = this.history.entries.filter((e) => e.sessionType === 'work');
    if (workEntries.length === 0) return 0;

    const uniqueDays = [...new Set(workEntries.map((e) => e.date))].sort().reverse();
    const today = this.getDateString(new Date());
    const yesterday = this.getDateString(new Date(Date.now() - 86400000));

    // Check if streak is active (today or yesterday has entries)
    if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prevDate = new Date(uniqueDays[i - 1]);
      const currDate = new Date(uniqueDays[i]);
      const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  getFilePath(): string {
    return this.filePath;
  }

  // Get stats for last week (Monday to Sunday of the previous week)
  getLastWeekStats(): { pomodoros: number; totalMinutes: number } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Calculate last week's Monday
    const mondayOffset = dayOfWeek === 0 ? -13 : -6 - dayOfWeek;
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() + mondayOffset);
    lastMonday.setHours(0, 0, 0, 0);
    
    // Calculate last week's Sunday
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    
    return this.getStatsForDateRange(lastMonday, lastSunday);
  }

  // Get most productive day of the week based on historical averages
  getMostProductiveDay(): { dayName: string; avgPomodoros: number } | null {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workEntries = this.history.entries.filter((e) => e.sessionType === 'work');
    
    if (workEntries.length === 0) return null;
    
    // Count pomodoros and occurrences for each day of week
    const dayStats: { [key: number]: { total: number; days: Set<string> } } = {};
    for (let i = 0; i < 7; i++) {
      dayStats[i] = { total: 0, days: new Set() };
    }
    
    for (const entry of workEntries) {
      const date = new Date(entry.date);
      const dayIndex = date.getDay();
      dayStats[dayIndex].total++;
      dayStats[dayIndex].days.add(entry.date);
    }
    
    // Find day with highest average
    let bestDay = 0;
    let bestAvg = 0;
    
    for (let i = 0; i < 7; i++) {
      const stats = dayStats[i];
      const dayCount = stats.days.size;
      if (dayCount > 0) {
        const avg = stats.total / dayCount;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestDay = i;
        }
      }
    }
    
    if (bestAvg === 0) return null;
    
    return {
      dayName: dayNames[bestDay],
      avgPomodoros: Math.round(bestAvg * 10) / 10,
    };
  }
}
