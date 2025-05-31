import { users, projects, type User, type InsertUser, type Project, type InsertProject } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  getFeaturedProjects(): Promise<Project[]>;
  getStats(): Promise<{
    totalFunded: string;
    activeProjects: number;
    backers: string;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private currentUserId: number;
  private currentProjectId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    
    // Initialize with some demo data structure (no mock data)
    this.initializeStorage();
  }

  private initializeStorage() {
    // Storage is ready, no demo data added
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = {
      ...insertProject,
      id,
      currentFunding: 0,
      createdAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async getFeaturedProjects(): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.isActive)
      .slice(0, 6);
  }

  async getStats(): Promise<{
    totalFunded: string;
    activeProjects: number;
    backers: string;
  }> {
    const activeProjects = Array.from(this.projects.values()).filter(p => p.isActive).length;
    const totalFunded = Array.from(this.projects.values())
      .reduce((sum, project) => sum + project.currentFunding, 0);
    
    return {
      totalFunded: `$${(totalFunded / 1000000).toFixed(1)}M`,
      activeProjects: activeProjects,
      backers: `${(this.users.size * 1000 / 1000).toFixed(1)}K`
    };
  }
}

export const storage = new MemStorage();
