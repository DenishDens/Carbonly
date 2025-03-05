import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";
import WebSocket from 'ws';

// Set WebSocket constructor for Neon
neonConfig.webSocketConstructor = WebSocket;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the pool with proper settings for better stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced from 10 to prevent connection overload
  idleTimeoutMillis: 60000, // Increased from 30000
  connectionTimeoutMillis: 10000, // Increased from 5000
  maxUses: 7500, // Add maximum uses per connection
  retryInterval: 100, // Add retry interval
  maxRetryAttempts: 3, // Add maximum retry attempts
});

// Initialize Drizzle with the schema
export const db = drizzle(pool, { schema });

// Enhanced connection error handling
async function validateConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (err) {
    console.error('Initial database connection error:', err);
    // Don't throw, let the application continue and retry
  }
}

// Call validation
validateConnection();

// Handle pool errors with reconnection logic
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  if (err.message.includes('Connection terminated')) {
    console.log('Attempting to reconnect...');
    validateConnection();
  }
});

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});