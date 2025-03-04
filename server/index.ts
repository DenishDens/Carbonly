import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import materialLibraryRoutes from './routes/materialLibrary';
import emissionsRoutes from './routes/emissions';
import { db } from "./db";
import { emissions } from "@shared/schema";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'SESSION_SECRET'
];

function checkEnvironmentVariables() {
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  log('All required environment variables are present');
}

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
  try {
    log("Starting server initialization...");

    // Check environment variables first
    checkEnvironmentVariables();

    // Test database connection using the emissions table since we know it exists
    try {
      await db.select().from(emissions).limit(1);
      log("Database connection successful");
    } catch (err) {
      log("Database connection test failed:", err);
      throw err;
    }

    log("Registering routes...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    // Register API routes
    app.use('/api/material-library', materialLibraryRoutes);
    app.use('/api/emissions', emissionsRoutes);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error details:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      try {
        await setupVite(app, server);
        log("Vite setup completed successfully");
      } catch (error) {
        log(`Vite setup failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    } else {
      log("Setting up static serving...");
      serveStatic(app);
      log("Static serving setup completed");
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started successfully, serving on port ${port}`);
      log(`Database URL: ${process.env.DATABASE_URL ? 'configured' : 'missing'}`);
    });
  } catch (error) {
    log(`Fatal error during server startup: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Full error details:', error);
    process.exit(1);
  }
})();