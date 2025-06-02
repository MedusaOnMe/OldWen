import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import campaignRoutes from "./routes/campaigns";
import balanceRoutes from "./routes/balances";
import adminRoutes from "./routes/admin";
import webhookRoutes from "./routes/webhook";
import { validateToken } from "./routes/helius";
import { initializeWebSocket } from "./services/websocket";
import { schedulerService } from "./services/scheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    res.json({ status: "ok", message: "Wendex API is running" });
  });

  // Get platform stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get featured projects
  app.get("/api/projects/featured", async (req, res) => {
    try {
      const projects = await storage.getFeaturedProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured projects" });
    }
  });

  // Helius token validation endpoint
  app.post("/api/helius/validate-token", validateToken);

  // Register all API routes
  app.use("/api", campaignRoutes);
  app.use("/api", balanceRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api", webhookRoutes);

  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  initializeWebSocket(httpServer);
  
  // Start scheduler service
  schedulerService.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    schedulerService.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    schedulerService.stop();
    process.exit(0);
  });
  
  return httpServer;
}
