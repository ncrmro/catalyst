#!/usr/bin/env node

// Simple script to test if fixtures can be imported
console.log('Testing fixtures import...');

try {
  // This will fail if zod is not available or if there are type errors
  require('../src/lib/fixtures.ts');
  console.log('✓ Fixtures import successful');
} catch (error) {
  console.error('✗ Fixtures import failed:', error.message);
  process.exit(1);
}
