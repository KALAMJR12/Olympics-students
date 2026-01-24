import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use DATABASE_URL if available, otherwise use local development defaults
const connectionString = process.env.DATABASE_URL || process.env.NODE_ENV === 'production'
  ? (() => { throw new Error("DATABASE_URL must be set in production"); })()
  : undefined;

export const pool = connectionString 
  ? new Pool({ connectionString })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;

