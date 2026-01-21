import { TextAttributes, type MouseEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { PomodoroState, PomodoroConfig } from "../types";
import type { Project, ProjectColor } from "../projects";
import { useState, type ReactNode } from "react";

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

type TimePeriod = "today" | "week" | "month" | "all";

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
  // New props
  lastWeekStats: TimeStats;
  mostProductiveDay: { dayName: string; avgPomodoros: number } | null;
  // Optional callbacks for interactivity
  onPeriodSelect?: (period: TimePeriod) => void;
  selectedPeriod?: TimePeriod;
}

// Get color based on percentage (green for good, yellow for medium, red for low)
function getProgressColor(percentage: number): string {
  if (percentage >= 70) return "green";
  if (percentage >= 40) return "yellow";
  return "red";
}

// Get color for week comparison
function getComparisonColor(changePercent: number): string {
  if (changePercent > 0) return "green";
  if (changePercent < 0) return "red";
  return "yellow";
}

// Get arrow for week comparison
function getComparisonArrow(changePercent: number): string {
  if (changePercent > 0) return "\u2191"; // ↑
  if (changePercent < 0) return "\u2193"; // ↓
  return "\u2192"; // →
}

// Render a horizontal bar chart for weekly data
function renderBarChart(
  data: DailyStats[],
  maxHeight: number = 5,
  compact: boolean = false
): ReactNode[] {
  const maxPomodoros = Math.max(...data.map(d => d.pomodoros), 1);
  const lines: ReactNode[] = [];
  
  const colWidth = compact ? 3 : 5;
  
  // Build chart from top to bottom
  for (let row = maxHeight; row >= 1; row--) {
    const threshold = (row / maxHeight) * maxPomodoros;
    let lineContent: ReactNode[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const day = data[i];
      // Color based on performance relative to average
      const avg = data.reduce((sum, d) => sum + d.pomodoros, 0) / data.length;
      let barColor = "green";
      if (day.pomodoros < avg * 0.5) barColor = "red";
      else if (day.pomodoros < avg) barColor = "yellow";
      
      let segment = "";
      if (day.pomodoros >= threshold) {
        segment = compact ? "\u2588\u2588 " : " \u2588\u2588  ";
      } else if (day.pomodoros >= threshold - (maxPomodoros / maxHeight / 2)) {
        segment = compact ? "\u2584\u2584 " : " \u2584\u2584  ";
      } else {
        segment = compact ? "   " : "     ";
      }
      
      lineContent.push(<text key={`bar-${row}-${i}`} fg={day.pomodoros >= threshold ? barColor : "gray"}>{segment}</text>);
    }
    
    lines.push(<box key={`row-${row}`} flexDirection="row">{lineContent}</box>);
  }
  
  // Add day labels
  let labelLine = "";
  for (const day of data) {
    if (compact) {
      labelLine += day.dayLabel.charAt(0) + "  ";
    } else {
      const label = day.dayLabel.padStart(4, " ").padEnd(5, " ");
      labelLine += label;
    }
  }
  lines.push(<text key="labels" fg="gray">{labelLine}</text>);
  
  // Add pomodoro counts
  let countLine = "";
  for (const day of data) {
    const count = day.pomodoros.toString();
    if (compact) {
      countLine += count.padEnd(3, " ");
    } else {
      const padLeft = Math.floor((5 - count.length) / 2);
      const padRight = 5 - count.length - padLeft;
      countLine += " ".repeat(padLeft) + count + " ".repeat(padRight);
    }
  }
  lines.push(<text key="counts" fg="yellow">{countLine}</text>);
  
  return lines;
}

// Render week comparison
function renderWeekComparison(thisWeek: number, lastWeek: number, compact: boolean = false): ReactNode {
  const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);
  const arrow = getComparisonArrow(change);
  const color = getComparisonColor(change);
  const absChange = Math.abs(change);
  
  if (compact) {
    return (
      <box flexDirection="row">
        <text fg="gray">vs last: </text>
        <text fg={color}>{arrow} {absChange}%</text>
      </box>
    );
  }
  
  return (
    <box flexDirection="row">
      <text fg="gray">vs Last Week: </text>
      <text fg={color} attributes={TextAttributes.BOLD}>{arrow} {absChange}%</text>
    </box>
  );
}

// Render a progress bar
function renderProgressBar(percentage: number, width: number, color: ProjectColor | string): ReactNode {
  const filledLength = Math.round((width * percentage) / 100);
  const emptyLength = width - filledLength;
  const filled = "\u2588".repeat(filledLength);
  const empty = "\u2591".repeat(emptyLength);
  
  return (
    <box flexDirection="row">
      <text fg={color}>{filled}</text>
      <text fg="gray">{empty}</text>
    </box>
  );
}

// Stat card component with hover effect
function StatCard({ 
  title, 
  value, 
  subtitle, 
  color = "cyan",
  compact = false,
  onClick,
  selected = false,
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  color?: string;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const borderColor = selected ? color : isHovered ? "cyan" : "gray";
  const titleColor = isHovered || selected ? "white" : "gray";
  
  return (
    <box 
      flexDirection="column" 
      alignItems="center" 
      paddingLeft={compact ? 1 : 2}
      paddingRight={compact ? 1 : 2}
      border
      borderStyle={selected ? "double" : "single"}
      borderColor={borderColor}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onMouseUp={onClick ? (e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      } : undefined}
    >
      <text fg={titleColor}>{compact ? title.substring(0, 3) : title}</text>
      <text attributes={TextAttributes.BOLD} fg={color}>{value}</text>
      {subtitle && !compact && <text attributes={TextAttributes.DIM}>{subtitle}</text>}
    </box>
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
  lastWeekStats,
  mostProductiveDay,
  onPeriodSelect,
  selectedPeriod,
}: StatsTabProps) {
  const { width: termWidth } = useTerminalDimensions();
  const [localSelectedPeriod, setLocalSelectedPeriod] = useState<TimePeriod | null>(selectedPeriod || null);
  
  // Handle period selection
  const handlePeriodClick = (period: TimePeriod) => {
    setLocalSelectedPeriod(period);
    onPeriodSelect?.(period);
  };
  
  const currentPeriod = selectedPeriod || localSelectedPeriod;
  
  // 5-tier responsive layout
  const isUltraCompact = termWidth < 50;
  const isVeryCompact = termWidth >= 50 && termWidth < 70;
  const isCompact = termWidth >= 70 && termWidth < 90;
  const isMedium = termWidth >= 90 && termWidth < 110;
  const isFull = termWidth >= 110;
  
  const hoursToday = Math.floor(todayStats.totalMinutes / 60);
  const minutesToday = todayStats.totalMinutes % 60;
  const hoursWeek = Math.floor(weekStats.totalMinutes / 60);
  const minutesWeek = weekStats.totalMinutes % 60;
  const hoursMonth = Math.floor(monthStats.totalMinutes / 60);
  const minutesMonth = monthStats.totalMinutes % 60;
  const hoursAllTime = Math.floor(allTimeStats.totalMinutes / 60);

  // Progress bar width based on terminal size
  const progressBarWidth = isFull ? 20 : isCompact ? 15 : 12;
  
  // Donut size based on terminal size
  const donutSize: "small" | "medium" | "large" = isFull ? "large" : isMedium ? "medium" : "small";

  // Ultra compact layout (<50)
  if (isUltraCompact) {
    return (
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <box justifyContent="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg="cyan">STATS</text>
        </box>
        
        <box justifyContent="center" marginBottom={1} flexDirection="row" flexWrap="wrap">
          <text fg="green">Today:{todayStats.pomodoros} </text>
          <text fg="yellow">Week:{weekStats.pomodoros} </text>
        </box>
        
        <box justifyContent="center" marginBottom={1} flexDirection="row">
          <text fg="red">{"\u2605"}{streak}d </text>
          <text fg="blue">{averagePomodoros}/d</text>
        </box>
        
        {mostProductiveDay && (
          <box justifyContent="center">
            <text fg="magenta">{"\uD83C\uDFC6"}{mostProductiveDay.dayName.substring(0, 3)}</text>
          </box>
        )}
      </box>
    );
  }

  // Very compact layout (50-69)
  if (isVeryCompact) {
    return (
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <box justifyContent="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg="cyan">DASHBOARD</text>
        </box>
        
        <box justifyContent="center" marginBottom={1} flexDirection="row" flexWrap="wrap">
          <StatCard 
            title="TODAY" 
            value={todayStats.pomodoros} 
            color="green" 
            compact
            onClick={() => handlePeriodClick("today")}
            selected={currentPeriod === "today"}
          />
          <StatCard 
            title="WEEK" 
            value={weekStats.pomodoros} 
            color="yellow" 
            compact
            onClick={() => handlePeriodClick("week")}
            selected={currentPeriod === "week"}
          />
          <StatCard 
            title="MONTH" 
            value={monthStats.pomodoros} 
            color="magenta" 
            compact
            onClick={() => handlePeriodClick("month")}
            selected={currentPeriod === "month"}
          />
          <StatCard 
            title="ALL" 
            value={allTimeStats.pomodoros} 
            color="cyan" 
            compact
            onClick={() => handlePeriodClick("all")}
            selected={currentPeriod === "all"}
          />
        </box>
        
        <box justifyContent="center" marginBottom={1} flexDirection="row" flexWrap="wrap">
          <box paddingLeft={1} paddingRight={1} flexDirection="row">
            <text fg="red">{"\u2605"} </text>
            <text fg="red" attributes={TextAttributes.BOLD}>{streak}d</text>
          </box>
          <box paddingLeft={1} paddingRight={1} flexDirection="row">
            <text fg="blue">{"\u2022"} </text>
            <text fg="blue" attributes={TextAttributes.BOLD}>{averagePomodoros}/d</text>
          </box>
        </box>
        
        {/* Week comparison and tasks */}
        <box justifyContent="center" marginBottom={1} flexDirection="row">
          {renderWeekComparison(weekStats.pomodoros, lastWeekStats.pomodoros, true)}
          <text fg="gray"> | Tasks: {projectStats.completedTasks}/{projectStats.totalTasks}</text>
        </box>
        
        {mostProductiveDay && (
          <box justifyContent="center">
            <text fg="magenta">{"\uD83C\uDFC6"} {mostProductiveDay.dayName.substring(0, 3)} ({mostProductiveDay.avgPomodoros}p)</text>
          </box>
        )}
      </box>
    );
  }

  // Compact layout (70-89)
  if (isCompact) {
    return (
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <box justifyContent="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg="cyan">DASHBOARD</text>
        </box>

        {/* Stats Row */}
        <box justifyContent="center" marginBottom={1} flexDirection="row" flexWrap="wrap">
          <StatCard 
            title="TODAY" 
            value={todayStats.pomodoros} 
            subtitle={`${hoursToday}h${minutesToday}m`} 
            color="green" 
            compact
            onClick={() => handlePeriodClick("today")}
            selected={currentPeriod === "today"}
          />
          <StatCard 
            title="WEEK" 
            value={weekStats.pomodoros} 
            subtitle={`${hoursWeek}h${minutesWeek}m`} 
            color="yellow" 
            compact
            onClick={() => handlePeriodClick("week")}
            selected={currentPeriod === "week"}
          />
          <StatCard 
            title="MONTH" 
            value={monthStats.pomodoros} 
            color="magenta" 
            compact
            onClick={() => handlePeriodClick("month")}
            selected={currentPeriod === "month"}
          />
          <StatCard 
            title="ALL" 
            value={allTimeStats.pomodoros} 
            color="cyan" 
            compact
            onClick={() => handlePeriodClick("all")}
            selected={currentPeriod === "all"}
          />
        </box>

        {/* Streak, Average, Best Day */}
        <box justifyContent="center" marginBottom={1} flexDirection="row" flexWrap="wrap">
          <box paddingLeft={1} paddingRight={1} flexDirection="row">
            <text fg="red">{"\u2605"} Streak: </text>
            <text attributes={TextAttributes.BOLD} fg="red">{streak}d</text>
          </box>
          <box paddingLeft={1} paddingRight={1} flexDirection="row">
            <text fg="blue">{"\u2022"} Avg: </text>
            <text attributes={TextAttributes.BOLD} fg="blue">{averagePomodoros}/d</text>
          </box>
          {mostProductiveDay && (
            <box paddingLeft={1} paddingRight={1} flexDirection="row">
              <text fg="magenta">{"\uD83C\uDFC6"} </text>
              <text fg="magenta">{mostProductiveDay.dayName.substring(0, 3)} ({mostProductiveDay.avgPomodoros}p)</text>
            </box>
          )}
        </box>

        {/* Two column: Chart and Donut */}
        <box justifyContent="center" flexDirection="row" flexWrap="wrap">
          {/* Weekly Chart */}
          <box 
            flexDirection="column" 
            border
            borderStyle="single" 
            borderColor="gray"
            paddingLeft={1}
            paddingRight={1}
            marginRight={1}
          >
            <box justifyContent="center" marginBottom={1}>
              <text attributes={TextAttributes.BOLD} fg="white">7 DAYS</text>
            </box>
            <box flexDirection="column" alignItems="center">
              {renderBarChart(dailyStats, 3, true)}
            </box>
            <box marginTop={1} justifyContent="center">
              {renderWeekComparison(weekStats.pomodoros, lastWeekStats.pomodoros, true)}
            </box>
          </box>

        </box>

        {/* Session Info */}
        <box justifyContent="center" marginTop={1}>
          <text fg="gray">Session: {state.completedPomodoros}p | Tasks: {projectStats.completedTasks}/{projectStats.totalTasks}</text>
        </box>
      </box>
    );
  }

  // Medium layout (90-109)
  if (isMedium) {
    return (
      <box flexDirection="column" paddingTop={1} paddingBottom={1}>
        <box justifyContent="center" marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg="cyan">DASHBOARD</text>
        </box>

        {/* Stats Row */}
        <box justifyContent="center" marginBottom={1} flexDirection="row">
          <StatCard 
            title="TODAY" 
            value={todayStats.pomodoros} 
            subtitle={`${hoursToday}h ${minutesToday}m`} 
            color="green"
            onClick={() => handlePeriodClick("today")}
            selected={currentPeriod === "today"}
          />
          <StatCard 
            title="WEEK" 
            value={weekStats.pomodoros} 
            subtitle={`${hoursWeek}h ${minutesWeek}m`} 
            color="yellow"
            onClick={() => handlePeriodClick("week")}
            selected={currentPeriod === "week"}
          />
          <StatCard 
            title="MONTH" 
            value={monthStats.pomodoros} 
            subtitle={`${hoursMonth}h ${minutesMonth}m`} 
            color="magenta"
            onClick={() => handlePeriodClick("month")}
            selected={currentPeriod === "month"}
          />
          <StatCard 
            title="ALL TIME" 
            value={allTimeStats.pomodoros} 
            subtitle={`${hoursAllTime}h total`} 
            color="cyan"
            onClick={() => handlePeriodClick("all")}
            selected={currentPeriod === "all"}
          />
        </box>

        {/* Streak, Average, Best Day */}
        <box justifyContent="center" marginBottom={1} flexDirection="row">
          <box paddingLeft={2} paddingRight={2} flexDirection="row">
            <text fg="red">{"\u2605"} Streak: </text>
            <text attributes={TextAttributes.BOLD} fg="red">{streak} days</text>
          </box>
          <box paddingLeft={2} paddingRight={2} flexDirection="row">
            <text fg="blue">{"\u2022"} Avg: </text>
            <text attributes={TextAttributes.BOLD} fg="blue">{averagePomodoros} p/day</text>
          </box>
          <box paddingLeft={2} paddingRight={2} flexDirection="row">
            <text fg="gray">{"\u2022"} Days: </text>
            <text attributes={TextAttributes.BOLD} fg="gray">{allTimeStats.totalDays}</text>
          </box>
        </box>

        {mostProductiveDay && (
          <box justifyContent="center" marginBottom={1}>
            <text fg="magenta">{"\uD83C\uDFC6"} Best Day: {mostProductiveDay.dayName} ({mostProductiveDay.avgPomodoros} pomodoros avg)</text>
          </box>
        )}

        {/* Three column layout */}
        <box justifyContent="center" flexDirection="row">
          {/* Weekly Chart */}
          <box 
            flexDirection="column" 
            border
            borderStyle="single" 
            borderColor="gray"
            paddingLeft={1}
            paddingRight={1}
            marginRight={1}
          >
            <box justifyContent="center" marginBottom={1}>
              <text attributes={TextAttributes.BOLD} fg="white">LAST 7 DAYS</text>
            </box>
            <box flexDirection="column" alignItems="center">
              {renderBarChart(dailyStats, 4, true)}
            </box>
            <box marginTop={1} justifyContent="center">
              {renderWeekComparison(weekStats.pomodoros, lastWeekStats.pomodoros, false)}
            </box>
          </box>

          {/* Top Projects */}
          <box 
            flexDirection="column" 
            border
            borderStyle="single" 
            borderColor="gray"
            paddingLeft={1}
            paddingRight={1}
            width={28}
          >
            <box justifyContent="center" marginBottom={1}>
              <text attributes={TextAttributes.BOLD} fg="white">PROJECTS</text>
            </box>
            {topProjects.slice(0, 2).map(({ project, stats }) => (
              <box key={project.id} flexDirection="row" justifyContent="space-between" marginTop={1}>
                <text fg={project.color}>
                  {project.name.length > 10 ? project.name.substring(0, 10) + ".." : project.name}
                </text>
                <box flexDirection="row">
                  {renderProgressBar(stats.percentage, 8, project.color)}
                  <text fg="white"> {stats.percentage.toString().padStart(3)}%</text>
                </box>
              </box>
            ))}
            {topProjects.length === 0 && (
              <text attributes={TextAttributes.DIM}>No projects</text>
            )}
          </box>
        </box>

        {/* Session Info */}
        <box justifyContent="center" marginTop={1} flexDirection="row">
          <text fg="gray">Session: {state.completedPomodoros}p  |  Config: {config.workDuration}/{config.shortBreakDuration}/{config.longBreakDuration}m</text>
        </box>
      </box>
    );
  }

  // Full layout (110+)
  return (
    <box flexDirection="column" paddingTop={1} paddingBottom={1}>
      {/* Header */}
      <box justifyContent="center" marginBottom={1}>
        <text attributes={TextAttributes.BOLD} fg="cyan">DASHBOARD</text>
      </box>

      {/* Top Section: Stats Cards */}
      <box justifyContent="center" marginBottom={1} flexDirection="row">
        <StatCard 
          title="TODAY" 
          value={todayStats.pomodoros} 
          subtitle={`${hoursToday}h ${minutesToday}m`} 
          color="green" 
          onClick={() => handlePeriodClick("today")}
          selected={currentPeriod === "today"}
        />
        <StatCard 
          title="WEEK" 
          value={weekStats.pomodoros} 
          subtitle={`${hoursWeek}h ${minutesWeek}m`} 
          color="yellow" 
          onClick={() => handlePeriodClick("week")}
          selected={currentPeriod === "week"}
        />
        <StatCard 
          title="MONTH" 
          value={monthStats.pomodoros} 
          subtitle={`${hoursMonth}h ${minutesMonth}m`} 
          color="magenta" 
          onClick={() => handlePeriodClick("month")}
          selected={currentPeriod === "month"}
        />
        <StatCard 
          title="ALL TIME" 
          value={allTimeStats.pomodoros} 
          subtitle={`${hoursAllTime}h total`} 
          color="cyan" 
          onClick={() => handlePeriodClick("all")}
          selected={currentPeriod === "all"}
        />
      </box>

      {/* Streak, Average, Days, Best Day */}
      <box justifyContent="center" marginBottom={1} flexDirection="row">
        <box paddingLeft={2} paddingRight={2} flexDirection="row">
          <text fg="red">{"\u2605"} Streak: </text>
          <text attributes={TextAttributes.BOLD} fg="red">{streak} days</text>
        </box>
        <box paddingLeft={2} paddingRight={2} flexDirection="row">
          <text fg="blue">{"\u2022"} Average: </text>
          <text attributes={TextAttributes.BOLD} fg="blue">{averagePomodoros} p/day</text>
        </box>
        <box paddingLeft={2} paddingRight={2} flexDirection="row">
          <text fg="gray">{"\u2022"} Total Days: </text>
          <text attributes={TextAttributes.BOLD} fg="gray">{allTimeStats.totalDays}</text>
        </box>
        {mostProductiveDay && (
          <box paddingLeft={2} paddingRight={2} flexDirection="row">
            <text fg="magenta">{"\uD83C\uDFC6"} Best Day: </text>
            <text attributes={TextAttributes.BOLD} fg="magenta">{mostProductiveDay.dayName} ({mostProductiveDay.avgPomodoros}p avg)</text>
          </box>
        )}
      </box>

      {/* Bottom Section: Weekly Chart + Projects */}
      <box justifyContent="center" flexDirection="row">
        {/* Weekly Chart */}
        <box 
          flexDirection="column" 
          border
          borderStyle="rounded" 
          borderColor="gray"
          paddingLeft={2}
          paddingRight={2}
          marginRight={2}
        >
          <box justifyContent="center" marginBottom={1}>
            <text attributes={TextAttributes.BOLD} fg="white">LAST 7 DAYS</text>
          </box>
          <box flexDirection="column" alignItems="center">
            {renderBarChart(dailyStats, 5, false)}
          </box>
          <box marginTop={1} justifyContent="center">
            {renderWeekComparison(weekStats.pomodoros, lastWeekStats.pomodoros, false)}
          </box>
        </box>

        {/* Projects Panel */}
        <box 
          flexDirection="column" 
          border
          borderStyle="rounded" 
          borderColor="gray"
          paddingLeft={2}
          paddingRight={2}
          width={38}
        >
          <box justifyContent="center" marginBottom={1}>
            <text attributes={TextAttributes.BOLD} fg="white">PROJECTS</text>
          </box>
          
          {/* Overall Progress */}
          <box flexDirection="column" marginBottom={1}>
            <box justifyContent="space-between" flexDirection="row">
              <text fg="gray">Overall Progress</text>
              <text fg="white">{projectStats.overallPercentage}%</text>
            </box>
            <box>
              {renderProgressBar(projectStats.overallPercentage, progressBarWidth, getProgressColor(projectStats.overallPercentage))}
            </box>
            <box justifyContent="space-between" flexDirection="row">
              <text attributes={TextAttributes.DIM}>{projectStats.completedTasks}/{projectStats.totalTasks} tasks</text>
              <text attributes={TextAttributes.DIM}>{projectStats.activeProjects} active</text>
            </box>
          </box>

          {/* Top Projects */}
          {topProjects.length > 0 && (
            <box flexDirection="column">
              <text fg="gray" attributes={TextAttributes.DIM}>Top Projects:</text>
              {topProjects.slice(0, 2).map(({ project, stats }) => (
                <box key={project.id} flexDirection="row" justifyContent="space-between" marginTop={1}>
                  <text fg={project.color}>
                    {project.name.length > 12 ? project.name.substring(0, 12) + ".." : project.name}
                  </text>
                  <box flexDirection="row">
                    {renderProgressBar(stats.percentage, 12, project.color)}
                    <text fg="white"> {stats.percentage.toString().padStart(3)}%</text>
                  </box>
                </box>
              ))}
            </box>
          )}

          {topProjects.length === 0 && (
            <text attributes={TextAttributes.DIM}>No projects yet</text>
          )}
        </box>
      </box>

      {/* Footer */}
      <box justifyContent="center" marginTop={1} flexDirection="row">
        <box paddingLeft={1} paddingRight={1} flexDirection="row">
          <text fg="gray">Session: </text>
          <text fg="white">{state.completedPomodoros} pomodoros</text>
        </box>
        <box paddingLeft={1} paddingRight={1} flexDirection="row">
          <text fg="gray">Config: </text>
          <text fg="white">{config.workDuration}/{config.shortBreakDuration}/{config.longBreakDuration}m</text>
        </box>
      </box>
    </box>
  );
}
