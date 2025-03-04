import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    checkEnvironmentVariables();

    log("Registering routes...");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error details:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      log("Setting up static serving...");
      serveStatic(app);
      log("Static serving setup completed");
    }

    const port = 5000; // Explicitly set port to 5000
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`Server started successfully on http://0.0.0.0:${port}`);
      log('Application initialization complete and ready to handle requests');
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          log(`Port ${port} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          log(`Port ${port} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    log(`Fatal error during server startup: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Full error details:', error);
    process.exit(1);
  }
})();