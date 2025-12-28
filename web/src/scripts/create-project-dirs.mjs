#!/usr/bin/env node
/**
 * Script to create project work and prs directories
 * This is a workaround for bash issues
 *
 * Usage: cd web && node src/scripts/create-project-dirs.mjs
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const basePath = join(__dirname, '../../app/(dashboard)/projects/[slug]');

// Create directories
const dirs = [
  join(basePath, 'work'),
  join(basePath, 'prs'),
  join(basePath, 'prs', '[number]'),
];

console.log('Creating directories...');
console.log('Base path:', basePath);

dirs.forEach(dir => {
  try {
    mkdirSync(dir, { recursive: true });
    console.log(`✓ Created: ${dir}`);
    // Create a .gitkeep file to ensure directory is tracked
    writeFileSync(join(dir, '.gitkeep'), '');
  } catch (error) {
    console.error(`✗ Failed to create ${dir}:`, error.message);
  }
});

console.log('Done!');
