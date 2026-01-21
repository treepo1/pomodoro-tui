import { TextAttributes, type MouseEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import type { Project, ProjectColor } from "../projects";
import { useState, type ReactNode } from "react";

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
  // Mouse interaction callbacks
  onProjectClick?: (index: number) => void;
  onTaskClick?: (index: number) => void;
}

function renderProgressBar(percentage: number, width: number = 20, color: ProjectColor): ReactNode {
  const filledLength = Math.round((width * percentage) / 100);
  const emptyLength = width - filledLength;
  const filled = "\u2588".repeat(filledLength);
  const empty = "\u2591".repeat(emptyLength);
  
  return (
    <box flexDirection="row">
      <text fg={color}>{filled}</text>
      <text fg="gray">{empty}</text>
      <text fg="white"> {percentage}%</text>
    </box>
  );
}

function renderMiniChart(stats: { total: number; completed: number; percentage: number }, color: ProjectColor): ReactNode {
  // Simple bar chart representation
  const height = 5;
  const barWidth = 3;
  const filledHeight = Math.round((height * stats.percentage) / 100);
  
  const lines: ReactNode[] = [];
  for (let i = height - 1; i >= 0; i--) {
    const isFilled = i < filledHeight;
    lines.push(
      <text key={i} fg={isFilled ? color : "gray"}>
        {isFilled ? "\u2588".repeat(barWidth) : "\u2591".repeat(barWidth)}
      </text>
    );
  }
  
  return (
    <box flexDirection="column" alignItems="center">
      {lines}
    </box>
  );
}

// Hoverable project card component
interface ProjectCardProps {
  project: Project;
  stats: { total: number; completed: number; percentage: number };
  isSelected: boolean;
  isCurrent: boolean;
  onClick?: () => void;
}

function ProjectCard({ project, stats, isSelected, isCurrent, onClick }: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine border color based on state: selected > hovered > default
  const borderColor = isSelected ? "yellow" : isHovered ? "cyan" : "gray";
  
  return (
    <box
      flexDirection="column"
      alignItems="center"
      marginLeft={2}
      marginRight={2}
      marginTop={1}
      marginBottom={1}
      border
      borderStyle="rounded"
      borderColor={borderColor}
      paddingLeft={1}
      paddingRight={1}
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onMouseUp={(e: MouseEvent) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <box flexDirection="row">
        <text attributes={TextAttributes.BOLD} fg={isHovered ? "cyan" : project.color}>
          {project.name}
        </text>
        {isCurrent && <text fg="yellow"> *</text>}
      </box>
      
      {/* Mini progress chart */}
      <box marginTop={1} marginBottom={1}>
        {renderMiniChart(stats, project.color)}
      </box>
      
      {/* Progress bar */}
      <box>
        {renderProgressBar(stats.percentage, 15, project.color)}
      </box>
      
      <text fg="gray" attributes={TextAttributes.DIM}>
        {stats.completed}/{stats.total}
      </text>
    </box>
  );
}

// Hoverable task item component for detail view
interface HoverableTaskItemProps {
  task: { id: string; text: string; completed: boolean };
  isSelected: boolean;
  onClick?: () => void;
}

function HoverableTaskItem({ task, isSelected, onClick }: HoverableTaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const prefix = isSelected ? "> " : isHovered ? "> " : "  ";
  const checkbox = task.completed ? "[x]" : "[ ]";
  const textColor = isSelected ? "yellow" : isHovered ? "cyan" : task.completed ? "gray" : "white";
  
  return (
    <box
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onMouseUp={(e: MouseEvent) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <text
        fg={textColor}
        attributes={task.completed && !isSelected && !isHovered ? TextAttributes.DIM : undefined}
      >
        {prefix}{checkbox} {task.text}
      </text>
    </box>
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
  onProjectClick,
  onTaskClick,
}: ProjectsTabProps) {
  const { height: termHeight, width: termWidth } = useTerminalDimensions();
  // Reserve space for: outer border (2) + tabs (3) + title (1) + current project (2) + controls (2) + padding (4)
  const scrollHeight = Math.max(5, termHeight - 14);

  if (addProjectMode) {
    return (
      <box flexDirection="column" alignItems="center" paddingTop={1} paddingBottom={1}>
        <text attributes={TextAttributes.BOLD} fg="cyan">CREATE NEW PROJECT</text>
        <box marginTop={1} marginBottom={1} flexDirection="row">
          <text fg="yellow">Project name: </text>
          <text fg="white">{projectInput}</text>
          <text fg="gray">|</text>
        </box>
        <text fg="gray" attributes={TextAttributes.DIM}>Press Enter to create, Esc to cancel</text>
      </box>
    );
  }

  if (projects.length === 0) {
    return (
      <box flexDirection="column" alignItems="center" paddingTop={1} paddingBottom={1}>
        <text attributes={TextAttributes.BOLD} fg="cyan">PROJECTS</text>
        <box marginTop={2} marginBottom={2}>
          <text fg="gray">No projects yet</text>
        </box>
        <text fg="gray" attributes={TextAttributes.DIM}>Press 'c' to create a new project</text>
      </box>
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
      <box flexDirection="column" alignItems="center" paddingTop={1} paddingBottom={1}>
        <box marginBottom={1} flexDirection="row">
          <text attributes={TextAttributes.BOLD} fg={project.color}>{project.name}</text>
          {isCurrent && <text fg="yellow"> [CURRENT]</text>}
        </box>
        
        {project.description && (
          <box marginBottom={1}>
            <text fg="gray">{project.description}</text>
          </box>
        )}

        {/* Progress Section */}
        <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center">
          <text fg="white">Progress</text>
          <box marginTop={1} marginBottom={1}>
            {renderProgressBar(stats.percentage, 30, project.color)}
          </box>
          <text fg="gray">
            {stats.completed}/{stats.total} tasks completed
          </text>
        </box>

        {/* Visual Chart */}
        <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center">
          {renderMiniChart(stats, project.color)}
        </box>

        {/* Add Task Mode */}
        {addTaskMode && (
          <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center">
            <text fg="yellow">New task: </text>
            <box>
              <text fg="white">{taskInput}</text>
              <text fg="gray">|</text>
            </box>
            <text fg="gray" attributes={TextAttributes.DIM}>Press Enter to add, Esc to cancel</text>
          </box>
        )}

        {/* Task List */}
        {!addTaskMode && (
          <box marginTop={1} marginBottom={1} flexDirection="column" alignItems="center" width="100%">
            <text fg="white" attributes={TextAttributes.BOLD}>Tasks</text>
            {allTasks.length === 0 ? (
              <text fg="gray">No tasks yet. Press 'a' to add one.</text>
            ) : (
              <scrollbox
                scrollY
                height={Math.max(3, scrollHeight - 12)}
                width={termWidth - 10}
                marginTop={1}
              >
                <box flexDirection="column">
                  {allTasks.map((task, idx) => (
                    <HoverableTaskItem
                      key={task.id}
                      task={task}
                      isSelected={idx === selectedTaskIndex}
                      onClick={() => onTaskClick?.(idx)}
                    />
                  ))}
                </box>
              </scrollbox>
            )}
          </box>
        )}

        {/* Controls hint */}
        <box marginTop={1}>
          <text fg="gray" attributes={TextAttributes.DIM}>
            Esc: back | a: add task | Space: toggle | d: delete | {!isCurrent ? "Enter: set current" : ""}
          </text>
        </box>
      </box>
    );
  }

  // List view - show all projects with progress
  return (
    <box flexDirection="column" alignItems="center" paddingTop={1} paddingBottom={1}>
      <text attributes={TextAttributes.BOLD} fg="cyan">PROJECTS</text>
      
      {/* Projects overview with charts - scrollable */}
      <scrollbox
        scrollY
        height={scrollHeight}
        width={termWidth - 6}
        marginTop={1}
        marginBottom={1}
      >
        <box flexDirection="row" justifyContent="center" flexWrap="wrap">
          {projects.map((project, idx) => {
            const projectStats = getProjectStats(project.id);
            const isSelected = idx === selectedProjectIndex;
            const isCurrent = project.id === currentProjectId;
            
            return (
              <ProjectCard
                key={project.id}
                project={project}
                stats={projectStats}
                isSelected={isSelected}
                isCurrent={isCurrent}
                onClick={() => onProjectClick?.(idx)}
              />
            );
          })}
        </box>
      </scrollbox>

      {/* Current project indicator */}
      {currentProjectId && (
        <box marginTop={1} marginBottom={1} flexDirection="row">
          <text fg="gray">Current: </text>
          <text fg="yellow">{projects.find(p => p.id === currentProjectId)?.name || "None"}</text>
        </box>
      )}

      {/* Controls hint */}
      <box marginTop={1}>
        <text fg="gray" attributes={TextAttributes.DIM}>
          {"<"}/{">"}: navigate | Enter: view details | c: create | D: delete | Enter on selected: set current
        </text>
      </box>
    </box>
  );
}
