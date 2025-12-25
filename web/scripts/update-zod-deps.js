#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Change to backend package directory
const backendDir = path.join(__dirname, '../packages/@tetrastack/backend');
process.chdir(backendDir);

console.log('Installing drizzle-zod in @tetrastack/backend...');
try {
  execSync('npm install drizzle-zod', { stdio: 'inherit' });
  console.log('✓ drizzle-zod installed successfully');
} catch (error) {
  console.error('✗ Failed to install drizzle-zod:', error.message);
  process.exit(1);
}

// Change to web root directory
const webDir = path.join(__dirname, '..');
process.chdir(webDir);

console.log('\nRemoving zod from root package.json...');
try {
  execSync('npm uninstall zod', { stdio: 'inherit' });
  console.log('✓ zod removed from root successfully');
} catch (error) {
  console.error('✗ Failed to remove zod:', error.message);
  process.exit(1);
}

console.log('\n✓ All operations completed successfully');
