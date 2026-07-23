// db.ts (or keep the filename same as you are using)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function connectDB() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error(' Failed to connect to database:', error);
    throw error;
  }
}
