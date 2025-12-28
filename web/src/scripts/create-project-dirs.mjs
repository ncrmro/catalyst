#!/usr/bin/env node
/**
 * Script to create project work and prs directories
 * This is a workaround for bash issues
 *
 * Usage: cd web && node src/scripts/create-project-dirs.mjs
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basePath = join(__dirname, '../../app/(dashboard)/projects/[slug]');

console.log('🏗️  Creating project page directories...');
console.log('📁 Base path:', basePath);
console.log('');

// Check if base path exists
if (!existsSync(basePath)) {
  console.error('❌ Base path does not exist:', basePath);
  process.exit(1);
}

// Create directories
const dirs = [
  join(basePath, 'work'),
  join(basePath, 'prs'),
  join(basePath, 'prs', '[number]'),
];

let success = 0;
let failed = 0;

dirs.forEach(dir => {
  try {
    if (existsSync(dir)) {
      console.log(`⏭️  Already exists: ${dir}`);
      success++;
    } else {
      mkdirSync(dir, { recursive: true });
      console.log(`✓ Created: ${dir}`);
      // Create a .gitkeep file to ensure directory is tracked
      writeFileSync(join(dir, '.gitkeep'), '');
      success++;
    }
  } catch (error) {
    console.error(`✗ Failed to create ${dir}:`, error.message);
    failed++;
  }
});

console.log('');
console.log(`✅ Done! ${success} directories ready, ${failed} failed.`);
