import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

// Load environment variables
dotenv.config();

// Log environment variables for debugging
console.log('[Server Startup] Environment variables loaded:');
console.log('[Server Startup] - NODE_ENV:', process.env.NODE_ENV);
console.log('[Server Startup] - HELIUS_API_KEY exists:', !!process.env.HELIUS_API_KEY);
console.log('[Server Startup] - HELIUS_API_KEY length:', process.env.HELIUS_API_KEY?.length);
console.log('[Server Startup] - HELIUS_API_KEY first 8:', process.env.HELIUS_API_KEY?.substring(0, 8));
if (process.env.NODE_ENV === 'development') {
  console.log('[Server Startup] - Helius integration configured');
}

const app = express();

// SECURITY MIDDLEWARE
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://replit.com", "https://*.replit.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://firestore.googleapis.com", "https://firebase.googleapis.com", "https://firebasestorage.googleapis.com", "https://api.devnet.solana.com", "https://api.mainnet-beta.solana.com", "https://mainnet.helius-rpc.com", "https://*.helius-rpc.com", "https://api.coingecko.com", "https://solana-api.projectserum.com", "wss:", "ws:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS PROTECTION
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// RATE LIMITING
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests from this IP',
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Very restrictive for admin
  message: 'Too many admin requests from this IP',
});

app.use('/api', generalLimiter);
app.use('/api/admin', adminLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
