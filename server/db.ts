import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Set WebSocket constructor based on environment
if (process.env.NODE_ENV === 'production') {
  // In production, we need to use the ws module directly
  neonConfig.webSocketConstructor = require('ws');
} else {
  // In development, use the imported ws
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with proper SSL settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? true : false,
});

// Initialize Drizzle with the schema
export const db = drizzle(pool, { schema });

// Verify database connection on startup
pool.connect()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection error:', err));