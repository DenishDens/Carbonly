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

// Configure the pool with proper SSL settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? true : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
});

// Initialize Drizzle with the schema
export const db = drizzle(pool, { schema });

// Verify database connection on startup
pool.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => {
    console.error('Database connection error:', err);
    // Don't exit the process, let it retry
  });

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Pool will automatically try to reconnect
});