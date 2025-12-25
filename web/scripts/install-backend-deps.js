#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '../packages/@tetrastack/backend');

console.log('Installing dependencies in @tetrastack/backend...');
console.log('Working directory:', backendDir);

try {
  execSync('npm install', { 
    cwd: backendDir, 
    stdio: 'inherit',
    timeout: 120000 // 2 minutes
  });
  console.log('\n✓ Backend dependencies installed successfully');
} catch (error) {
  console.error('\n✗ Failed to install backend dependencies');
  console.error('Error:', error.message);
  process.exit(1);
}
