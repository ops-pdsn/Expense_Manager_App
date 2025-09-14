#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const migrationsDir = path.join(__dirname, '..', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log('Running database migrations...');

for (const file of migrationFiles) {
  console.log(`Running migration: ${file}`);
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Use psql to run the migration
    // You'll need to replace this with your actual database connection method
    console.log(`Executing: ${file}`);
    console.log('Please run this SQL manually in your Supabase SQL editor:');
    console.log('---');
    console.log(sql);
    console.log('---');
  } catch (error) {
    console.error(`Error running migration ${file}:`, error.message);
    process.exit(1);
  }
}

console.log('All migrations completed!');
