import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
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
      log(logLine);
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

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error details:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error handler caught: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    const isDev = app.get("env") === "development";
    if (isDev) {
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

    // First try port 5001, then fall back to 5000 if 5001 is in use
    const ports = [5001, 5000];
    const host = "0.0.0.0"; // Listen on all interfaces

    for (const port of ports) {
      try {
        // Attempt to listen on the current port
        await new Promise((resolve, reject) => {
          server.listen(port, host)
            .once('listening', () => {
              log(`Server started successfully on http://${host}:${port}`);
              resolve(true);
            })
            .once('error', (err) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${port} is in use, trying next port...`);
                resolve(false);
              } else {
                reject(err);
              }
            });
        });
        break; // If we get here, we successfully bound to a port
      } catch (error) {
        log(`Error binding to port ${port}: ${error instanceof Error ? error.message : String(error)}`);
        if (port === ports[ports.length - 1]) {
          // If this was the last port to try, throw the error
          throw error;
        }
      }
    }

  } catch (error) {
    log(`Fatal error during server startup: ${error instanceof Error ? error.message : String(error)}`);
    console.error('Full error details:', error);
    process.exit(1);
  }
})();