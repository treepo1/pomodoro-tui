import { TextAttributes, type MouseEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useState } from "react";
import type { PomodoroState, PomodoroConfig, JamParticipant } from "../types";
import { renderBigText, getOptimalTimerMode, getBigTextWidth } from "../ui";
import { getSessionColor, getSessionLabel, getSessionDuration, getConnectionDisplay } from "../utils";
import type { JamConnectionState } from "../types";
import { TaskList } from "./TaskList";
import type { Project, ProjectTask } from "../projects";

// Layout breakpoints based on total terminal width
const BREAKPOINTS = {
  SHOW_TASK_LIST: 100,     // Show task list sidebar
  FULL_LAYOUT: 80,         // Full layout with spacer
  COMPACT_MODE: 50,        // Use very compact layout
};

interface TimerTabProps {
  state: PomodoroState;
  config: PomodoroConfig;
  isJamMode: boolean;
  isCurrentHost: boolean;
  canControl: boolean;
  jamSessionCode: string;
  jamConnectionState: JamConnectionState;
  jamParticipants: JamParticipant[];
  jamManagerId?: string;
  todayStats: { pomodoros: number; totalMinutes: number };
  musicStatus: string;
  formatTime: (seconds: number) => string;
  // Project-based task props
  currentProject: Project | null;
  projectTasks: ProjectTask[];
  selectedTaskIndex: number;
  addTaskMode: boolean;
  taskInput: string;
  projectStats: { total: number; completed: number; percentage: number };
  projectIndex: number;
  totalProjects: number;
  // Mouse interaction
  onTaskClick?: (index: number) => void;
  onToggleTimer?: () => void;
}

// Play/Pause button component with hover effect
function PlayPauseButton({ 
  isRunning, 
  onClick,
  canControl = true,
}: { 
  isRunning: boolean;
  onClick?: () => void;
  canControl?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Icons: ▶ (play), ⏸ (pause), ⏵ (play alternative)
  const playIcon = "\u25B6";  // ▶
  const pauseIcon = "\u23F8"; // ⏸
  
  const icon = isRunning ? pauseIcon : playIcon;
  const label = isRunning ? "RUNNING" : "PAUSED";
  const color = isRunning ? "green" : isHovered ? "cyan" : "yellow";
  
  if (!canControl) {
    // Show status without click interaction for non-hosts in jam mode
    return (
      <box marginTop={1} marginBottom={1}>
        <text fg={isRunning ? "green" : "yellow"}>
          {icon} {label}
        </text>
      </box>
    );
  }
  
  return (
    <box 
      marginTop={1} 
      marginBottom={1}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onMouseUp={onClick ? (e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      } : undefined}
    >
      <text fg={color} attributes={isHovered ? TextAttributes.BOLD : undefined}>
        {icon} {isHovered ? (isRunning ? "CLICK TO PAUSE" : "CLICK TO START") : label}
      </text>
    </box>
  );
}

export function TimerTab({
  state,
  config,
  isJamMode,
  isCurrentHost,
  canControl,
  jamSessionCode,
  jamConnectionState,
  jamParticipants,
  jamManagerId,
  todayStats,
  musicStatus,
  formatTime,
  currentProject,
  projectTasks,
  selectedTaskIndex,
  addTaskMode,
  taskInput,
  projectStats,
  projectIndex,
  totalProjects,
  onTaskClick,
  onToggleTimer,
}: TimerTabProps) {
  const { width: termWidth } = useTerminalDimensions();
  
  // Determine layout based on terminal width
  const showTaskList = termWidth >= BREAKPOINTS.SHOW_TASK_LIST;
  const showLeftSpacer = termWidth >= BREAKPOINTS.FULL_LAYOUT && showTaskList;
  const isCompact = termWidth < BREAKPOINTS.COMPACT_MODE;
  
  // Calculate available width for timer content
  // Terminal width minus: borders (2), padding (4), task list (32 if shown)
  const usedWidth = 6 + (showTaskList ? 32 : 0) + (showLeftSpacer ? 20 : 0);
  const availableWidth = Math.max(15, termWidth - usedWidth);
  
  // Get optimal timer display mode based on available space
  const timerMode = getOptimalTimerMode(availableWidth);
  
  const time = formatTime(state.timeRemaining);
  const session = state.currentSession;
  const color = getSessionColor(session);
  const label = getSessionLabel(session);
  const sessionDuration = getSessionDuration(session, config) || 1;
  const progress = (state.timeRemaining / (sessionDuration * 60)) * 100;
  
  // Calculate timer display width to help with progress bar sizing
  const timerDisplayWidth = getBigTextWidth(time, timerMode);
  
  // Responsive progress bar length - match timer width or available space
  const progressBarLength = Math.min(
    timerMode === "small" ? 20 : timerDisplayWidth,
    Math.max(10, availableWidth - 2)
  );
  const filledLength = Math.max(0, Math.min(progressBarLength, Math.round((progressBarLength * progress) / 100)));
  const progressBar =
    "\u2588".repeat(filledLength) + "\u2591".repeat(progressBarLength - filledLength);

  const bigTimeLines = renderBigText(time, timerMode);
  const connDisplay = getConnectionDisplay(jamConnectionState);

  // Ultra compact layout for very small terminals
  if (isCompact) {
    return (
      <box flexDirection="column" alignItems="center" width="100%">
        <box marginBottom={1} flexDirection="row">
          <text attributes={TextAttributes.BOLD} fg={color}>
            [{label}]
          </text>
          <text> </text>
          <text attributes={TextAttributes.BOLD} fg="yellow">
            {time}
          </text>
          {!state.isRunning && (
            <text fg="yellow"> [P]</text>
          )}
        </box>
        <box marginBottom={1}>
          <text fg={color}>{progressBar}</text>
        </box>
        {isJamMode && (
          <text fg="yellow" attributes={TextAttributes.DIM}>JAM: {jamSessionCode}</text>
        )}
        {!isJamMode && (
          <text fg="gray" attributes={TextAttributes.DIM}>Today: {todayStats.pomodoros}p ({todayStats.totalMinutes}m)</text>
        )}
      </box>
    );
  }

  return (
    <box flexDirection="row" justifyContent="space-between" width="100%">
      {/* Left spacer for centering - only show on wide terminals with task list */}
      {showLeftSpacer && <box width={20} />}

      {/* Center column - Timer */}
      <box flexDirection="column" alignItems="center" flexGrow={1}>
        <box marginTop={1} marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg={color}>
            [ {label} ]
          </text>
        </box>
        
        {/* Big Timer Display */}
        <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center" height={bigTimeLines.length}>
          {bigTimeLines.map((line, i) => (
            <text key={i} attributes={TextAttributes.BOLD} fg="yellow">
              {line}
            </text>
          ))}
        </box>
        
        {/* Progress Bar */}
        <box marginTop={1} marginBottom={1}>
          <text fg={color}>{progressBar}</text>
        </box>
        
        {/* Play/Pause Button - clickable */}
        <PlayPauseButton 
          isRunning={state.isRunning} 
          onClick={onToggleTimer}
          canControl={canControl}
        />

        {/* Jam Session Info */}
        {isJamMode && (
          <>
            <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center">
              <text fg="yellow" attributes={TextAttributes.BOLD}>
                JAM SESSION: {jamSessionCode}
              </text>
              <box>
                <text fg={connDisplay.color}>
                  {connDisplay.symbol} {connDisplay.text}
                </text>
              </box>
            </box>

            {jamParticipants.length > 0 && (
              <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center">
                <text fg="gray">Participants ({jamParticipants.length}):</text>
                {(() => {
                  let transferIndex = 0;
                  return jamParticipants.map((p) => {
                    const isMe = p.id === jamManagerId;
                    const canTransferTo = isCurrentHost && !p.isHost && !isMe;
                    const transferNum = canTransferTo ? ++transferIndex : 0;
                    return (
                      <text key={p.id} fg={isMe ? "cyan" : "white"}>
                        {p.isHost
                          ? "*"
                          : canTransferTo
                            ? `[${transferNum}]`
                            : "-"}{" "}
                        {p.name}
                        {p.isHost ? " (host)" : ""}
                        {isMe ? " (you)" : ""}
                      </text>
                    );
                  });
                })()}
              </box>
            )}

            {!canControl && (
              <box marginTop={1} marginBottom={1}>
                <text fg="gray" attributes={TextAttributes.DIM}>
                  Only the host can control the timer
                </text>
              </box>
            )}

            {isCurrentHost && (
              <box marginTop={1} marginBottom={1}>
                <text fg="gray">Share: pomotui --join {jamSessionCode}</text>
              </box>
            )}
          </>
        )}

        {/* Stats when not in jam mode */}
        {!isJamMode && (
          <box marginTop={1} marginBottom={1}>
            <text fg="gray">
              Today: {todayStats.pomodoros} pomodoros ({todayStats.totalMinutes}m)
            </text>
          </box>
        )}
        
        {/* Config info */}
        <box marginTop={1} marginBottom={1}>
          <text fg="gray">
            Work: {config.workDuration}m | Short: {config.shortBreakDuration}m | Long: {config.longBreakDuration}m
          </text>
        </box>
        
        {/* Music status */}
        <box marginTop={1} marginBottom={1}>
          <text fg="magenta">{musicStatus}</text>
        </box>
      </box>

      {/* Right column - Project Task List - only show on wide terminals */}
      {showTaskList && (
        <TaskList
          project={currentProject}
          tasks={projectTasks}
          selectedIndex={selectedTaskIndex}
          addMode={addTaskMode}
          taskInput={taskInput}
          projectStats={projectStats}
          projectIndex={projectIndex}
          totalProjects={totalProjects}
          onTaskClick={onTaskClick}
        />
      )}
    </box>
  );
}
