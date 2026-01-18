import React from "react";
import { Box, Text } from "ink";
import type { Project, ProjectColor } from "../projects";

interface ProjectsTabProps {
  projects: Project[];
  currentProjectId: string | null;
  selectedProjectIndex: number;
  selectedTaskIndex: number;
  viewMode: "list" | "detail";
  addProjectMode: boolean;
  projectInput: string;
  addTaskMode: boolean;
  taskInput: string;
  getProjectStats: (id: string) => { total: number; completed: number; percentage: number };
}

function renderProgressBar(percentage: number, width: number = 20, color: ProjectColor): React.ReactNode {
  const filledLength = Math.round((width * percentage) / 100);
  const emptyLength = width - filledLength;
  const filled = "\u2588".repeat(filledLength);
  const empty = "\u2591".repeat(emptyLength);
  
  return (
    <Text>
      <Text color={color}>{filled}</Text>
      <Text color="gray">{empty}</Text>
      <Text color="white"> {percentage}%</Text>
    </Text>
  );
}

function renderMiniChart(stats: { total: number; completed: number; percentage: number }, color: ProjectColor): React.ReactNode {
  // Simple bar chart representation
  const height = 5;
  const barWidth = 3;
  const filledHeight = Math.round((height * stats.percentage) / 100);
  
  const lines: React.ReactNode[] = [];
  for (let i = height - 1; i >= 0; i--) {
    const isFilled = i < filledHeight;
    lines.push(
      <Text key={i} color={isFilled ? color : "gray"}>
        {isFilled ? "\u2588".repeat(barWidth) : "\u2591".repeat(barWidth)}
      </Text>
    );
  }
  
  return (
    <Box flexDirection="column" alignItems="center">
      {lines}
    </Box>
  );
}

export function ProjectsTab({
  projects,
  currentProjectId,
  selectedProjectIndex,
  selectedTaskIndex,
  viewMode,
  addProjectMode,
  projectInput,
  addTaskMode,
  taskInput,
  getProjectStats,
}: ProjectsTabProps) {
  if (addProjectMode) {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Text bold color="cyan">CREATE NEW PROJECT</Text>
        <Box marginY={1}>
          <Text color="yellow">Project name: </Text>
          <Text color="white">{projectInput}</Text>
          <Text color="gray">|</Text>
        </Box>
        <Text color="gray" dimColor>Press Enter to create, Esc to cancel</Text>
      </Box>
    );
  }

  if (projects.length === 0) {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Text bold color="cyan">PROJECTS</Text>
        <Box marginY={2}>
          <Text color="gray">No projects yet</Text>
        </Box>
        <Text color="gray" dimColor>Press 'c' to create a new project</Text>
      </Box>
    );
  }

  if (viewMode === "detail" && projects[selectedProjectIndex]) {
    const project = projects[selectedProjectIndex];
    const stats = getProjectStats(project.id);
    const isCurrent = project.id === currentProjectId;
    const pendingTasks = project.tasks.filter(t => !t.completed);
    const completedTasks = project.tasks.filter(t => t.completed);
    const allTasks = [...pendingTasks, ...completedTasks];

    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color={project.color}>{project.name}</Text>
          {isCurrent && <Text color="yellow"> [CURRENT]</Text>}
        </Box>
        
        {project.description && (
          <Box marginBottom={1}>
            <Text color="gray">{project.description}</Text>
          </Box>
        )}

        {/* Progress Section */}
        <Box marginY={1} flexDirection="column" alignItems="center">
          <Text color="white">Progress</Text>
          <Box marginY={1}>
            {renderProgressBar(stats.percentage, 30, project.color)}
          </Box>
          <Text color="gray">
            {stats.completed}/{stats.total} tasks completed
          </Text>
        </Box>

        {/* Visual Chart */}
        <Box marginY={1} flexDirection="column" alignItems="center">
          {renderMiniChart(stats, project.color)}
        </Box>

        {/* Add Task Mode */}
        {addTaskMode && (
          <Box marginY={1} flexDirection="column" alignItems="center">
            <Text color="yellow">New task: </Text>
            <Box>
              <Text color="white">{taskInput}</Text>
              <Text color="gray">|</Text>
            </Box>
            <Text color="gray" dimColor>Press Enter to add, Esc to cancel</Text>
          </Box>
        )}

        {/* Task List */}
        {!addTaskMode && (
          <Box marginY={1} flexDirection="column" alignItems="center" width="100%">
            <Text color="white" bold>Tasks</Text>
            {allTasks.length === 0 ? (
              <Text color="gray">No tasks yet. Press 'a' to add one.</Text>
            ) : (
              <Box flexDirection="column" marginTop={1}>
                {allTasks.map((task, idx) => {
                  const isSelected = idx === selectedTaskIndex;
                  const prefix = isSelected ? "> " : "  ";
                  const checkbox = task.completed ? "[x]" : "[ ]";
                  return (
                    <Text
                      key={task.id}
                      color={isSelected ? "yellow" : task.completed ? "gray" : "white"}
                      dimColor={task.completed && !isSelected}
                    >
                      {prefix}{checkbox} {task.text}
                    </Text>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* Controls hint */}
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Esc: back | a: add task | Space: toggle | d: delete | {!isCurrent ? "Enter: set current" : ""}
          </Text>
        </Box>
      </Box>
    );
  }

  // List view - show all projects with progress
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text bold color="cyan">PROJECTS</Text>
      
      {/* Projects overview with charts */}
      <Box marginY={1} flexDirection="row" justifyContent="center" flexWrap="wrap">
        {projects.map((project, idx) => {
          const stats = getProjectStats(project.id);
          const isSelected = idx === selectedProjectIndex;
          const isCurrent = project.id === currentProjectId;
          
          return (
            <Box
              key={project.id}
              flexDirection="column"
              alignItems="center"
              marginX={2}
              marginY={1}
              borderStyle={isSelected ? "round" : undefined}
              borderColor={isSelected ? "yellow" : undefined}
              paddingX={isSelected ? 1 : 0}
            >
              <Box>
                <Text bold color={project.color}>
                  {project.name}
                </Text>
                {isCurrent && <Text color="yellow"> *</Text>}
              </Box>
              
              {/* Mini progress chart */}
              <Box marginY={1}>
                {renderMiniChart(stats, project.color)}
              </Box>
              
              {/* Progress bar */}
              <Box>
                {renderProgressBar(stats.percentage, 15, project.color)}
              </Box>
              
              <Text color="gray" dimColor>
                {stats.completed}/{stats.total}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Current project indicator */}
      {currentProjectId && (
        <Box marginY={1}>
          <Text color="gray">
            Current: <Text color="yellow">{projects.find(p => p.id === currentProjectId)?.name || "None"}</Text>
          </Text>
        </Box>
      )}

      {/* Controls hint */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {"<"}/{">"}: navigate | Enter: view details | c: create | D: delete | Enter on selected: set current
        </Text>
      </Box>
    </Box>
  );
}
