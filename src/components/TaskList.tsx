import React from "react";
import { Box, Text } from "ink";
import type { Project, ProjectTask, ProjectColor } from "../projects";

interface TaskItemProps {
  task: ProjectTask;
  selected: boolean;
}

function TaskItem({ task, selected }: TaskItemProps) {
  const checkbox = task.completed ? "[x]" : "[ ]";
  const prefix = selected ? "> " : "  ";
  const textColor = task.completed ? "gray" : "white";

  return (
    <Text
      color={selected ? "cyan" : textColor}
      dimColor={task.completed && !selected}
    >
      {prefix}
      {checkbox} {task.text}
    </Text>
  );
}

function renderProgressBar(
  percentage: number,
  width: number,
  color: ProjectColor,
): React.ReactNode {
  const filledLength = Math.round((width * percentage) / 100);
  const emptyLength = width - filledLength;
  const filled = "\u2588".repeat(filledLength);
  const empty = "\u2591".repeat(emptyLength);

  return (
    <Text>
      <Text color={color}>{filled}</Text>
      <Text color="gray">{empty}</Text>
    </Text>
  );
}

interface TaskListProps {
  project: Project | null;
  tasks: ProjectTask[];
  selectedIndex: number;
  addMode: boolean;
  taskInput: string;
  projectStats: { total: number; completed: number; percentage: number };
  projectIndex: number; // 0-based, -1 if no projects
  totalProjects: number;
  collapsed?: boolean;
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
  collapsed = false,
}: TaskListProps) {
  const projectNumber = `${projectIndex + 1}/${totalProjects}`;

  if (!project) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        paddingY={0}
        width={30}
        alignSelf="flex-start"
      >
        <Box marginBottom={1}>
          <Text bold color="gray">
            NO PROJECT
          </Text>
        </Box>
        {addMode ? (
          <Box flexDirection="column" paddingY={1}>
            <Text color="yellow">&gt; New task: {taskInput}_</Text>
            <Box marginTop={1}>
              <Text dimColor>[Enter] create [Esc] cancel</Text>
            </Box>
          </Box>
        ) : !collapsed ? (
          <Box flexDirection="column" paddingY={1}>
            <Text dimColor> No projects yet.</Text>
            <Text dimColor> Press 'a' to create</Text>
            <Text dimColor> one and add your</Text>
            <Text dimColor> first task.</Text>
          </Box>
        ) : (
          <Text dimColor>[t] open</Text>
        )}
      </Box>
    );
  }

  // Collapsed view - minimal compact panel
  if (collapsed) {
    // No projects exist
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={project.color}
        paddingX={1}
        alignSelf="flex-start"
      >
        <Text bold color="gray">
          TASKS
        </Text>
        <Text color={project.color}>
          {project.name.length > 12
            ? project.name.substring(0, 12) + ".."
            : project.name}
        </Text>
        <Text dimColor>
          {projectStats.completed}/{projectStats.total} done
        </Text>
        <Text dimColor>[t] open</Text>
      </Box>
    );
  }

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={project.color}
      paddingX={1}
      paddingY={0}
      width={30}
    >
      {/* Project Header */}
      <Box justifyContent="space-between">
        <Text bold color={project.color}>
          {project.name.length > 18
            ? project.name.substring(0, 18) + "..."
            : project.name}
        </Text>
        <Text color="gray">{projectNumber}</Text>
      </Box>

      {/* Progress Bar */}
      <Box>
        {renderProgressBar(projectStats.percentage, 20, project.color)}
        <Text color="white"> {projectStats.percentage}%</Text>
      </Box>

      {/* TO DO Section */}
      <Box marginTop={1} marginBottom={0}>
        <Text bold color="white">
          TO DO
        </Text>
      </Box>

      {pending.length === 0 && !addMode && <Text dimColor> No tasks yet</Text>}

      {pending.map((task, i) => (
        <TaskItem key={task.id} task={task} selected={i === selectedIndex} />
      ))}

      {addMode && (
        <Box>
          <Text color="yellow">&gt; [ ] {taskInput}_</Text>
        </Box>
      )}

      {/* DONE Section */}
      <Box marginTop={1} marginBottom={0}>
        <Text bold color="gray">
          DONE
        </Text>
      </Box>

      {completed.length === 0 && <Text dimColor> None completed</Text>}

      {completed.map((task, i) => (
        <TaskItem
          key={task.id}
          task={task}
          selected={pending.length + i === selectedIndex}
        />
      ))}

      {/* Controls */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>[[/]] switch [a]dd [d]el</Text>
        <Text dimColor>[↑↓] nav [Space] toggle</Text>
        <Text dimColor>[t] collapse</Text>
      </Box>
    </Box>
  );
}
