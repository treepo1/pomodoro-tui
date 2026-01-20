import React from "react";
import { Box, Text } from "ink";
import type { PomodoroState, PomodoroConfig, JamParticipant } from "../types";
import { renderBigText } from "../ui";
import {
  getSessionColor,
  getSessionLabel,
  getSessionDuration,
  getConnectionDisplay,
} from "../utils";
import type { JamConnectionState } from "../types";
import { TaskList } from "./TaskList";
import type { Project, ProjectTask } from "../projects";

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
  taskListCollapsed: boolean;
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
  taskListCollapsed,
}: TimerTabProps) {
  const time = formatTime(state.timeRemaining);
  const session = state.currentSession;
  const color = getSessionColor(session);
  const label = getSessionLabel(session);
  const sessionDuration = getSessionDuration(session, config) || 1;
  const progress = (state.timeRemaining / (sessionDuration * 60)) * 100;
  const progressBarLength = 40;
  const filledLength = Math.max(
    0,
    Math.min(
      progressBarLength,
      Math.round((progressBarLength * progress) / 100),
    ),
  );
  const progressBar =
    "█".repeat(filledLength) + "░".repeat(progressBarLength - filledLength);

  const bigTimeLines = renderBigText(time);
  const connDisplay = getConnectionDisplay(jamConnectionState);

  return (
    <Box flexDirection="row" justifyContent="space-between" width="100%">
      {/* Left spacer for centering */}
      <Box width={30} />

      {/* Center column - Timer */}
      <Box flexDirection="column" alignItems="center" flexGrow={1}>
        <Box marginY={1}>
          <Text bold color={color}>
            [ {label} ]
          </Text>
        </Box>
        <Box marginY={1} flexDirection="column" alignItems="center">
          {bigTimeLines.map((line, i) => (
            <Text key={i} bold color="yellow">
              {line}
            </Text>
          ))}
        </Box>
        <Box marginY={0.4}>
          <Text color={color}>{progressBar}</Text>
        </Box>
        {!state.isRunning && (
          <Box marginY={0.4}>
            <Text color="yellow">[ PAUSED ]</Text>
          </Box>
        )}

        {isJamMode && (
          <>
            <Box marginY={0.4} flexDirection="column" alignItems="center">
              <Text color="yellow" bold>
                JAM SESSION: {jamSessionCode}
              </Text>
              <Box>
                <Text color={connDisplay.color as any}>
                  {connDisplay.symbol} {connDisplay.text}
                </Text>
              </Box>
            </Box>

            {jamParticipants.length > 0 && (
              <Box marginY={0.4} flexDirection="column" alignItems="center">
                <Text color="gray">
                  Participants ({jamParticipants.length}):
                </Text>
                {(() => {
                  let transferIndex = 0;
                  return jamParticipants.map((p) => {
                    const isMe = p.id === jamManagerId;
                    const canTransferTo = isCurrentHost && !p.isHost && !isMe;
                    const transferNum = canTransferTo ? ++transferIndex : 0;
                    return (
                      <Text key={p.id} color={isMe ? "cyan" : "white"}>
                        {p.isHost
                          ? "*"
                          : canTransferTo
                            ? `[${transferNum}]`
                            : "-"}{" "}
                        {p.name}
                        {p.isHost ? " (host)" : ""}
                        {isMe ? " (you)" : ""}
                      </Text>
                    );
                  });
                })()}
              </Box>
            )}

            {!canControl && (
              <Box marginY={0.4}>
                <Text color="gray" dimColor>
                  Only the host can control the timer
                </Text>
              </Box>
            )}

            {isCurrentHost && (
              <Box marginY={0.4}>
                <Text color="gray">Share: pomotui --join {jamSessionCode}</Text>
              </Box>
            )}
          </>
        )}

        {!isJamMode && (
          <Box marginY={0.4}>
            <Text color="gray">
              Today: {todayStats.pomodoros} pomodoros ({todayStats.totalMinutes}
              m)
            </Text>
          </Box>
        )}
        <Box marginY={0.4}>
          <Text color="gray">
            Work: {config.workDuration}m | Short: {config.shortBreakDuration}m |
            Long: {config.longBreakDuration}m
          </Text>
        </Box>
        <Box marginY={0.4}>
          <Text color="magenta">{musicStatus}</Text>
        </Box>
      </Box>

      {/* Right column - Project Task List */}
      <TaskList
        project={currentProject}
        tasks={projectTasks}
        selectedIndex={selectedTaskIndex}
        addMode={addTaskMode}
        taskInput={taskInput}
        projectStats={projectStats}
        projectIndex={projectIndex}
        totalProjects={totalProjects}
        collapsed={taskListCollapsed}
      />
    </Box>
  );
}
