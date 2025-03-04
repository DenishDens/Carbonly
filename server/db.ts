
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Create and export the drizzle database instance for use with the schema
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
