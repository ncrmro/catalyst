#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== Installing dependencies ===\n');

// Install in backend package
const backendDir = path.join(__dirname, '../packages/@tetrastack/backend');
console.log('Installing in @tetrastack/backend...');
try {
  execSync('npm install', { cwd: backendDir, stdio: 'inherit' });
  console.log('✓ Backend dependencies installed\n');
} catch (error) {
  console.error('✗ Failed to install backend dependencies:', error.message);
  process.exit(1);
}

// Install in root
const webDir = path.join(__dirname, '..');
console.log('Installing in web root...');
try {
  execSync('npm install', { cwd: webDir, stdio: 'inherit' });
  console.log('✓ Root dependencies installed\n');
} catch (error) {
  console.error('✗ Failed to install root dependencies:', error.message);
  process.exit(1);
}

console.log('\n=== Running typecheck ===\n');
try {
  execSync('npm run typecheck', { cwd: webDir, stdio: 'inherit' });
  console.log('\n✓ Typecheck passed');
} catch (error) {
  console.error('\n✗ Typecheck failed');
  process.exit(1);
}

console.log('\n✓ All operations completed successfully');
