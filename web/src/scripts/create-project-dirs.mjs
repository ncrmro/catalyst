#!/usr/bin/env node
/**
 * Script to create project work and prs directories
 * This is a workaround for bash issues
 */

import { mkdirSync } from 'fs';
import { join } from 'path';

const basePath = join(process.cwd(), 'src/app/(dashboard)/projects/[slug]');

// Create directories
const dirs = [
  join(basePath, 'work'),
  join(basePath, 'prs'),
  join(basePath, 'prs/[number]'),
];

dirs.forEach(dir => {
  try {
    mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  } catch (error) {
    console.error(`Failed to create ${dir}:`, error);
  }
});

console.log('Done!');
