import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import WebSocket from 'ws';

// Set WebSocket constructor for all environments
neonConfig.webSocketConstructor = WebSocket;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with proper SSL settings and robust retry logic
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? true : false,
  max: 5, // Reduce max connections to prevent overwhelming the database
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increase timeout for slower connections
  maxUses: 7500, // Recycle connections after 7500 queries
  allowExitOnIdle: true, // Allow clean shutdown
});

// Initialize Drizzle with the schema
export const db = drizzle(pool, { schema });

// Verify database connection on startup with retry logic
async function connectWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.connect();
      console.log('Database connected successfully');
      return;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`Failed to connect to database after ${retries} attempts`);
}

// Initialize connection
connectWithRetry().catch(err => {
  console.error('Fatal database connection error:', err);
  // Don't exit, let the application handle recovery
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Pool will automatically try to reconnect
});