import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

// Create database connection
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or SUPABASE_DB_URL must be set');
}

const client = postgres(connectionString);
const db = drizzle(client);

async function addProfilePhotoColumn() {
  try {
    console.log('Adding profile_photo_url column to users table...');
    
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_photo_url VARCHAR;
    `);
    
    console.log('Successfully added profile_photo_url column!');
  } catch (error) {
    console.error('Error adding column:', error);
  }
  
  await client.end();
  process.exit(0);
}

addProfilePhotoColumn();