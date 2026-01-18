import React from "react";
import { Box, Text } from "ink";
import type { PomodoroState, PomodoroConfig } from "../types";
import type { Project, ProjectColor } from "../projects";

interface TimeStats {
  pomodoros: number;
  totalMinutes: number;
}

interface DailyStats {
  date: string;
  dayLabel: string;
  pomodoros: number;
  minutes: number;
}

interface ProjectStats {
  project: Project;
  stats: { total: number; completed: number; percentage: number };
}

interface OverallProjectStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  overallPercentage: number;
  activeProjects: number;
  completedProjects: number;
}

interface StatsTabProps {
  state: PomodoroState;
  config: PomodoroConfig;
  todayStats: TimeStats;
  weekStats: TimeStats;
  monthStats: TimeStats;
  allTimeStats: { pomodoros: number; totalMinutes: number; totalDays: number };
  dailyStats: DailyStats[];
  streak: number;
  averagePomodoros: number;
  projectStats: OverallProjectStats;
  topProjects: ProjectStats[];
}

// Render a horizontal bar chart
function renderBarChart(
  data: DailyStats[],
  maxHeight: number = 5
): React.ReactNode[] {
  const maxPomodoros = Math.max(...data.map(d => d.pomodoros), 1);
  const lines: React.ReactNode[] = [];
  
  // Each column is 5 characters wide to match day labels (e.g., " Mon ")
  const colWidth = 5;
  
  // Build chart from top to bottom
  for (let row = maxHeight; row >= 1; row--) {
    const threshold = (row / maxHeight) * maxPomodoros;
    let line = "";
    for (const day of data) {
      if (day.pomodoros >= threshold) {
        line += " \u2588\u2588  "; // 5 chars: space, block, block, space, space
      } else if (day.pomodoros >= threshold - (maxPomodoros / maxHeight / 2)) {
        line += " \u2584\u2584  "; // 5 chars
      } else {
        line += "     "; // 5 chars (spaces)
      }
    }
    lines.push(
      <Text key={`row-${row}`} color="green">{line}</Text>
    );
  }
  
  // Add day labels - each 5 chars wide
  let labelLine = "";
  for (const day of data) {
    // Pad day label to 5 chars, centered
    const label = day.dayLabel.padStart(4, " ").padEnd(5, " ");
    labelLine += label;
  }
  lines.push(
    <Text key="labels" color="gray">{labelLine}</Text>
  );
  
  // Add pomodoro counts - each 5 chars wide
  let countLine = "";
  for (const day of data) {
    // Pad count to 5 chars, centered
    const count = day.pomodoros.toString();
    const padLeft = Math.floor((5 - count.length) / 2);
    const padRight = 5 - count.length - padLeft;
    countLine += " ".repeat(padLeft) + count + " ".repeat(padRight);
  }
  lines.push(
    <Text key="counts" color="yellow">{countLine}</Text>
  );
  
  return lines;
}

// Render a progress bar
function renderProgressBar(percentage: number, width: number, color: ProjectColor | string): React.ReactNode {
  const filledLength = Math.round((width * percentage) / 100);
  const emptyLength = width - filledLength;
  const filled = "\u2588".repeat(filledLength);
  const empty = "\u2591".repeat(emptyLength);
  
  return (
    <Text>
      <Text color={color as any}>{filled}</Text>
      <Text color="gray">{empty}</Text>
    </Text>
  );
}

// Stat card component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  color = "cyan" 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  color?: string;
}) {
  return (
    <Box 
      flexDirection="column" 
      alignItems="center" 
      paddingX={2}
      borderStyle="single"
      borderColor="gray"
    >
      <Text color="gray">{title}</Text>
      <Text bold color={color as any}>{value}</Text>
      {subtitle && <Text dimColor>{subtitle}</Text>}
    </Box>
  );
}

export function StatsTab({ 
  state, 
  config, 
  todayStats, 
  weekStats, 
  monthStats,
  allTimeStats,
  dailyStats,
  streak,
  averagePomodoros,
  projectStats,
  topProjects,
}: StatsTabProps) {
  const hoursToday = Math.floor(todayStats.totalMinutes / 60);
  const minutesToday = todayStats.totalMinutes % 60;
  const hoursWeek = Math.floor(weekStats.totalMinutes / 60);
  const minutesWeek = weekStats.totalMinutes % 60;
  const hoursMonth = Math.floor(monthStats.totalMinutes / 60);
  const minutesMonth = monthStats.totalMinutes % 60;
  const hoursAllTime = Math.floor(allTimeStats.totalMinutes / 60);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">DASHBOARD</Text>
      </Box>

      {/* Main Stats Row */}
      <Box justifyContent="center" marginBottom={1}>
        <StatCard 
          title="TODAY" 
          value={todayStats.pomodoros} 
          subtitle={`${hoursToday}h ${minutesToday}m`}
          color="green"
        />
        <StatCard 
          title="THIS WEEK" 
          value={weekStats.pomodoros} 
          subtitle={`${hoursWeek}h ${minutesWeek}m`}
          color="yellow"
        />
        <StatCard 
          title="THIS MONTH" 
          value={monthStats.pomodoros} 
          subtitle={`${hoursMonth}h ${minutesMonth}m`}
          color="magenta"
        />
        <StatCard 
          title="ALL TIME" 
          value={allTimeStats.pomodoros} 
          subtitle={`${hoursAllTime}h total`}
          color="cyan"
        />
      </Box>

      {/* Streak and Average Row */}
      <Box justifyContent="center" marginBottom={1}>
        <Box paddingX={3}>
          <Text color="red">{"\u2605"} </Text>
          <Text color="white">Streak: </Text>
          <Text bold color="red">{streak} days</Text>
        </Box>
        <Box paddingX={3}>
          <Text color="blue">{"\u2022"} </Text>
          <Text color="white">Daily Avg: </Text>
          <Text bold color="blue">{averagePomodoros} pomodoros</Text>
        </Box>
        <Box paddingX={3}>
          <Text color="gray">{"\u2022"} </Text>
          <Text color="white">Active Days: </Text>
          <Text bold color="gray">{allTimeStats.totalDays}</Text>
        </Box>
      </Box>

      {/* Two Column Layout: Chart and Projects */}
      <Box justifyContent="center">
        {/* Left: Weekly Chart */}
        <Box 
          flexDirection="column" 
          borderStyle="single" 
          borderColor="gray"
          paddingX={1}
          marginRight={1}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text bold color="white">LAST 7 DAYS</Text>
          </Box>
          <Box flexDirection="column" alignItems="center">
            {renderBarChart(dailyStats, 5)}
          </Box>
        </Box>

        {/* Right: Project Stats */}
        <Box 
          flexDirection="column" 
          borderStyle="single" 
          borderColor="gray"
          paddingX={1}
          width={35}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text bold color="white">PROJECTS</Text>
          </Box>
          
          {/* Overall Progress */}
          <Box flexDirection="column" marginBottom={1}>
            <Box justifyContent="space-between">
              <Text color="gray">Overall Progress</Text>
              <Text color="white">{projectStats.overallPercentage}%</Text>
            </Box>
            <Box>
              {renderProgressBar(projectStats.overallPercentage, 30, "cyan")}
            </Box>
            <Box justifyContent="space-between">
              <Text dimColor>{projectStats.completedTasks}/{projectStats.totalTasks} tasks</Text>
              <Text dimColor>{projectStats.activeProjects} active</Text>
            </Box>
          </Box>

          {/* Top Projects */}
          {topProjects.length > 0 && (
            <Box flexDirection="column">
              <Text color="gray" dimColor>Top Projects:</Text>
              {topProjects.slice(0, 4).map(({ project, stats }) => (
                <Box key={project.id} flexDirection="column">
                  <Box justifyContent="space-between">
                    <Text color={project.color}>
                      {project.name.length > 15 ? project.name.substring(0, 15) + ".." : project.name}
                    </Text>
                    <Text color="white">{stats.percentage}%</Text>
                  </Box>
                  <Box>
                    {renderProgressBar(stats.percentage, 30, project.color)}
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {topProjects.length === 0 && (
            <Text dimColor>No projects yet</Text>
          )}
        </Box>
      </Box>

      {/* Current Session Info */}
      <Box justifyContent="center" marginTop={1}>
        <Box paddingX={2}>
          <Text color="gray">Session: </Text>
          <Text color="white">{state.completedPomodoros} pomodoros</Text>
        </Box>
        <Box paddingX={2}>
          <Text color="gray">Settings: </Text>
          <Text color="white">{config.workDuration}m work / {config.shortBreakDuration}m short / {config.longBreakDuration}m long</Text>
        </Box>
      </Box>
    </Box>
  );
}
