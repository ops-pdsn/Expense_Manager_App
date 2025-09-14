#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 PDSN Expense Manager - Database Setup');
console.log('==========================================\n');

console.log('📋 Setup Instructions:');
console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
console.log('2. Navigate to your project: qnxtehhsqqquwhluuflp');
console.log('3. Go to SQL Editor');
console.log('4. Run the following migration scripts in order:\n');

const migrationsDir = path.join(__dirname, 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

migrationFiles.forEach((file, index) => {
  console.log(`📄 Migration ${index + 1}: ${file}`);
  console.log('─'.repeat(50));
  
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(sql);
  console.log('\n');
});

console.log('✅ After running these migrations:');
console.log('1. Copy config.example to .env');
console.log('2. Add your Supabase database URL to .env');
console.log('3. Run: npm run dev');
console.log('4. Try registering a new user!');
console.log('\n🎉 Your authentication should now work properly!');
