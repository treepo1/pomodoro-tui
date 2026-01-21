import { TextAttributes, type MouseEvent } from "@opentui/core";
import type { Project, ProjectTask, ProjectColor } from "../projects";
import { useState, type ReactNode } from "react";

interface TaskItemProps {
  task: ProjectTask;
  selected: boolean;
  onClick?: () => void;
}

function TaskItem({ task, selected, onClick }: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const checkbox = task.completed ? "[x]" : "[ ]";
  const prefix = selected ? "> " : isHovered ? "> " : "  ";
  const textColor = selected ? "cyan" : isHovered ? "yellow" : task.completed ? "gray" : "white";

  return (
    <box
      onMouseOver={() => setIsHovered(true)}
      onMouseOut={() => setIsHovered(false)}
      onMouseUp={onClick ? (e: MouseEvent) => {
        e.stopPropagation();
        onClick();
      } : undefined}
    >
      <text 
        fg={textColor} 
        attributes={task.completed && !selected && !isHovered ? TextAttributes.DIM : undefined}
      >
        {prefix}{checkbox} {task.text}
      </text>
    </box>
  );
}

function renderProgressBar(percentage: number, width: number, color: ProjectColor): ReactNode {
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

interface TaskListProps {
  project: Project | null;
  tasks: ProjectTask[];
  selectedIndex: number;
  addMode: boolean;
  taskInput: string;
  projectStats: { total: number; completed: number; percentage: number };
  projectIndex: number;      // 0-based, -1 if no projects
  totalProjects: number;
  onTaskClick?: (index: number) => void;
}

export function TaskList({ 
  project, 
  tasks, 
  selectedIndex, 
  addMode, 
  taskInput, 
  projectStats,
  projectIndex,
  totalProjects,
  onTaskClick,
}: TaskListProps) {
  // No projects exist
  if (!project) {
    return (
      <box
        flexDirection="column"
        border
        borderStyle="single"
        borderColor="gray"
        paddingLeft={1}
        paddingRight={1}
        paddingTop={0}
        paddingBottom={0}
        width={30}
      >
        <box marginBottom={1}>
          <text attributes={TextAttributes.BOLD} fg="gray">NO PROJECT</text>
        </box>
        <box flexDirection="column" paddingTop={1} paddingBottom={1}>
          <text attributes={TextAttributes.DIM}>  No projects yet.</text>
          <text attributes={TextAttributes.DIM}>  Press 'a' to create</text>
          <text attributes={TextAttributes.DIM}>  one and add your</text>
          <text attributes={TextAttributes.DIM}>  first task.</text>
        </box>
      </box>
    );
  }

  const pending = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);
  const projectNumber = `${projectIndex + 1}/${totalProjects}`;

  return (
    <box
      flexDirection="column"
      border
      borderStyle="single"
      borderColor={project.color}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={0}
      paddingBottom={0}
      width={30}
    >
      {/* Project Header */}
      <box justifyContent="space-between" flexDirection="row">
        <text attributes={TextAttributes.BOLD} fg={project.color}>
          {project.name.length > 18 ? project.name.substring(0, 18) + "..." : project.name}
        </text>
        <text fg="gray">{projectNumber}</text>
      </box>
      
      {/* Progress Bar */}
      <box flexDirection="row">
        {renderProgressBar(projectStats.percentage, 20, project.color)}
        <text fg="white"> {projectStats.percentage}%</text>
      </box>

      {/* TO DO Section */}
      <box marginTop={1} marginBottom={0}>
        <text attributes={TextAttributes.BOLD} fg="white">TO DO</text>
      </box>

      {pending.length === 0 && !addMode && (
        <text attributes={TextAttributes.DIM}>  No tasks yet</text>
      )}

      {pending.map((task, i) => (
        <TaskItem 
          key={task.id} 
          task={task} 
          selected={i === selectedIndex} 
          onClick={() => onTaskClick?.(i)}
        />
      ))}

      {addMode && (
        <box>
          <text fg="yellow">&gt; [ ] {taskInput}_</text>
        </box>
      )}

      {/* DONE Section */}
      <box marginTop={1} marginBottom={0}>
        <text attributes={TextAttributes.BOLD} fg="gray">DONE</text>
      </box>

      {completed.length === 0 && (
        <text attributes={TextAttributes.DIM}>  None completed</text>
      )}

      {completed.map((task, i) => (
        <TaskItem
          key={task.id}
          task={task}
          selected={pending.length + i === selectedIndex}
          onClick={() => onTaskClick?.(pending.length + i)}
        />
      ))}

      {/* Controls */}
      <box marginTop={1} flexDirection="column">
        <text attributes={TextAttributes.DIM}>[[/]] switch [a]dd [d]el</text>
        <text attributes={TextAttributes.DIM}>[up/down] nav [Space] toggle</text>
      </box>
    </box>
  );
}
