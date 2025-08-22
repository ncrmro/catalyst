#!/usr/bin/env tsx

/**
 * Database seeding script
 */

// Load environment variables
import 'dotenv/config';
import { seedDatabase } from '../src/db/seed';

async function main() {
  try {
    console.log('Starting database seeding...');
    await seedDatabase();
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

main();