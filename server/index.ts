import express, { type Request, Response, NextFunction } from "express";

// Force production mode to avoid Vite middleware
process.env.NODE_ENV = "production";

console.log('Starting Express server initialization...');
console.log('Current NODE_ENV:', process.env.NODE_ENV);
console.log('Current PORT env:', process.env.PORT);

const app = express();
app.use(express.json());

// Basic request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Basic test route
app.get("/api/health", (_req, res) => {
  console.log("Health check endpoint hit");
  res.json({ status: "ok" });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error details:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.log(`Error handler caught: ${status} - ${message}`);
  res.status(status).json({ message });
});

// Force port 5000 specifically for the workflow
const server = app.listen(5000, "0.0.0.0", () => {
  console.log(`Server started successfully on http://0.0.0.0:5000`);
});

// Handle server errors
server.on('error', (error: any) => {
  console.error('Server error:', error);
  process.exit(1);
});