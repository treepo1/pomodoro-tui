export interface ProjectTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: ProjectColor;
  tasks: ProjectTask[];
  createdAt: number;
  completedAt?: number;
}

export type ProjectColor = 
  | "red" 
  | "green" 
  | "yellow" 
  | "blue" 
  | "magenta" 
  | "cyan" 
  | "white";

export const PROJECT_COLORS: ProjectColor[] = [
  "red",
  "green", 
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
];

export interface ProjectsData {
  projects: Project[];
  currentProjectId: string | null;
  lastUpdated: string;
}
