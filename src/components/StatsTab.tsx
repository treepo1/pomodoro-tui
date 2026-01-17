import React from "react";
import { Box, Text } from "ink";
import type { PomodoroState, PomodoroConfig } from "../types";

interface StatsTabProps {
  state: PomodoroState;
  config: PomodoroConfig;
  todayStats: { pomodoros: number; totalMinutes: number };
}

export function StatsTab({ state, config, todayStats }: StatsTabProps) {
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text bold color="cyan">SESSION STATISTICS</Text>
      <Box marginY={1} flexDirection="column" alignItems="center">
        <Text color="white">Today</Text>
        <Text color="yellow" bold>{todayStats.pomodoros} pomodoros</Text>
        <Text color="gray">{todayStats.totalMinutes} minutes focused</Text>
      </Box>
      <Box marginY={1} flexDirection="column" alignItems="center">
        <Text color="white">Current Session</Text>
        <Text color="gray">Completed: {state.completedPomodoros} pomodoros</Text>
        <Text color="gray">Cycle: {state.currentCycle} of {config.pomodorosBeforeLongBreak}</Text>
      </Box>
      <Box marginY={1} flexDirection="column" alignItems="center">
        <Text color="white">Settings</Text>
        <Text color="gray">Work: {config.workDuration}m</Text>
        <Text color="gray">Short Break: {config.shortBreakDuration}m</Text>
        <Text color="gray">Long Break: {config.longBreakDuration}m</Text>
      </Box>
    </Box>
  );
}
