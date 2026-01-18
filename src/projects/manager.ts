import { homedir } from 'os';
import { join } from 'path';
import type { Project, ProjectTask, ProjectsData, ProjectColor } from './types';
import { PROJECT_COLORS } from './types';

const DEFAULT_PROJECTS_PATH = join(homedir(), '.pomotui-projects.json');
const OLD_TASKS_PATH = join(homedir(), '.pomotui-tasks.json');

export class ProjectManager {
  private data: ProjectsData;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || DEFAULT_PROJECTS_PATH;
    this.data = this.load();
    this.migrateStandaloneTasks();
  }

  // Migrate standalone tasks from old TaskManager to "General" project
  private migrateStandaloneTasks(): void {
    const fs = require('fs');
    
    if (!fs.existsSync(OLD_TASKS_PATH)) return;
    
    try {
      const file = Bun.file(OLD_TASKS_PATH);
      if (file.size === 0) {
        fs.unlinkSync(OLD_TASKS_PATH);
        return;
      }
      
      const oldTasks = require(OLD_TASKS_PATH);
      if (!Array.isArray(oldTasks) || oldTasks.length === 0) {
        fs.unlinkSync(OLD_TASKS_PATH);
        return;
      }
      
      // Find or create "General" project
      let generalProject = this.data.projects.find(p => p.name === "General");
      if (!generalProject) {
        generalProject = {
          id: this.generateId(),
          name: "General",
          description: "Migrated standalone tasks",
          color: "cyan",
          tasks: [],
          createdAt: Date.now(),
        };
        this.data.projects.unshift(generalProject);
      }
      
      // Migrate tasks
      for (const oldTask of oldTasks) {
        // Check if task already exists (avoid duplicates on multiple runs)
        if (!generalProject.tasks.some(t => t.id === oldTask.id)) {
          generalProject.tasks.push({
            id: oldTask.id,
            text: oldTask.text,
            completed: oldTask.completed,
            createdAt: oldTask.createdAt,
            completedAt: oldTask.completed ? oldTask.createdAt : undefined,
          });
        }
      }
      
      // Set as current project if none set
      if (!this.data.currentProjectId) {
        this.data.currentProjectId = generalProject.id;
      }
      
      this.save();
      fs.unlinkSync(OLD_TASKS_PATH);
    } catch {
      // Silently fail - don't break app if migration fails
    }
  }

  // Get or create a default project (used when adding tasks with no projects)
  getOrCreateDefaultProject(): Project {
    if (this.data.projects.length === 0) {
      const project = this.createProject("General", "Default project for tasks");
      this.data.currentProjectId = project.id;
      this.save();
      return project;
    }
    
    // Return current project if set, otherwise first project
    if (this.data.currentProjectId) {
      const current = this.data.projects.find(p => p.id === this.data.currentProjectId);
      if (current) return current;
    }
    
    return this.data.projects[0];
  }

  private load(): ProjectsData {
    try {
      const fs = require('fs');
      if (!fs.existsSync(this.filePath)) {
        return this.getDefaultData();
      }
      const file = Bun.file(this.filePath);
      if (file.size === 0) {
        return this.getDefaultData();
      }
      const content = require(this.filePath);
      return {
        projects: Array.isArray(content.projects) ? content.projects : [],
        currentProjectId: content.currentProjectId || null,
        lastUpdated: content.lastUpdated || new Date().toISOString(),
      };
    } catch {
      return this.getDefaultData();
    }
  }

  private getDefaultData(): ProjectsData {
    return {
      projects: [],
      currentProjectId: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async save(): Promise<void> {
    this.data.lastUpdated = new Date().toISOString();
    await Bun.write(this.filePath, JSON.stringify(this.data, null, 2));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  // Project CRUD operations
  createProject(name: string, description?: string, color?: ProjectColor): Project {
    const project: Project = {
      id: this.generateId(),
      name: name.trim(),
      description: description?.trim(),
      color: color || PROJECT_COLORS[this.data.projects.length % PROJECT_COLORS.length],
      tasks: [],
      createdAt: Date.now(),
    };
    this.data.projects.push(project);
    this.save();
    return project;
  }

  updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color'>>): void {
    const project = this.data.projects.find(p => p.id === id);
    if (project) {
      if (updates.name !== undefined) project.name = updates.name.trim();
      if (updates.description !== undefined) project.description = updates.description.trim();
      if (updates.color !== undefined) project.color = updates.color;
      this.save();
    }
  }

  deleteProject(id: string): void {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    if (this.data.currentProjectId === id) {
      this.data.currentProjectId = null;
    }
    this.save();
  }

  getProject(id: string): Project | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  getProjects(): Project[] {
    return [...this.data.projects];
  }

  // Current project management
  setCurrentProject(id: string | null): void {
    if (id === null || this.data.projects.some(p => p.id === id)) {
      this.data.currentProjectId = id;
      this.save();
    }
  }

  getCurrentProject(): Project | null {
    if (!this.data.currentProjectId) return null;
    return this.data.projects.find(p => p.id === this.data.currentProjectId) || null;
  }

  getCurrentProjectId(): string | null {
    return this.data.currentProjectId;
  }

  // Task operations within a project
  addTask(projectId: string, text: string): ProjectTask | null {
    const project = this.data.projects.find(p => p.id === projectId);
    if (!project) return null;

    const task: ProjectTask = {
      id: this.generateId(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    project.tasks.push(task);
    this.save();
    return task;
  }

  toggleTask(projectId: string, taskId: string): void {
    const project = this.data.projects.find(p => p.id === projectId);
    if (!project) return;

    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.completedAt = task.completed ? Date.now() : undefined;
      this.save();
    }
  }

  deleteTask(projectId: string, taskId: string): void {
    const project = this.data.projects.find(p => p.id === projectId);
    if (!project) return;

    project.tasks = project.tasks.filter(t => t.id !== taskId);
    this.save();
  }

  // Statistics
  getProjectStats(projectId: string): { total: number; completed: number; percentage: number } {
    const project = this.data.projects.find(p => p.id === projectId);
    if (!project) return { total: 0, completed: 0, percentage: 0 };

    const total = project.tasks.length;
    const completed = project.tasks.filter(t => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }

  getAllProjectsStats(): Array<{ project: Project; stats: { total: number; completed: number; percentage: number } }> {
    return this.data.projects.map(project => ({
      project,
      stats: this.getProjectStats(project.id),
    }));
  }

  // Get overall stats across all projects
  getOverallStats(): { 
    totalProjects: number; 
    totalTasks: number; 
    completedTasks: number; 
    overallPercentage: number;
    activeProjects: number;
    completedProjects: number;
  } {
    let totalTasks = 0;
    let completedTasks = 0;
    let completedProjects = 0;

    for (const project of this.data.projects) {
      const total = project.tasks.length;
      const completed = project.tasks.filter(t => t.completed).length;
      totalTasks += total;
      completedTasks += completed;
      
      // A project is "completed" if it has tasks and all are done
      if (total > 0 && completed === total) {
        completedProjects++;
      }
    }

    const overallPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeProjects = this.data.projects.length - completedProjects;

    return {
      totalProjects: this.data.projects.length,
      totalTasks,
      completedTasks,
      overallPercentage,
      activeProjects,
      completedProjects,
    };
  }

  // Get top projects by task count (for dashboard display)
  getTopProjects(limit: number = 5): Array<{ project: Project; stats: { total: number; completed: number; percentage: number } }> {
    return this.getAllProjectsStats()
      .sort((a, b) => b.stats.total - a.stats.total)
      .slice(0, limit);
  }
}
