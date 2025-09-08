#!/usr/bin/env node
/**
 * Script to seed the database with catalyst and meze projects
 * 
 * Usage:
 *   make seed-projects  (recommended - runs in Docker container with proper env)
 *   npm run seed:projects
 *   npx tsx src/scripts/seed-projects.ts
 */

import 'dotenv/config';
import { createCatalystAndMezeProjects } from '../lib/seed.js';
import { db } from '../db/index.js';
import { teams, users, teamsMemberships } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function seedProjects() {
  console.log('🌱 Starting to seed catalyst and meze projects...');

  try {
    console.log('🔌 Connecting to database...');
    
    // Try to get the first team, or create a default one
    let [team] = await db.select().from(teams).limit(1);
    
    if (!team) {
      console.log('No teams found. Creating a default team...');
      
      // Check if there's a user to assign as owner
      const [user] = await db.select().from(users).limit(1);
      
      if (!user) {
        console.error('❌ No users found. Please create a user first by logging into the application.');
        process.exit(1);
      }

      // Create a default team
      [team] = await db
        .insert(teams)
        .values({
          name: 'Default Team',
          description: 'Default team for seeded projects',
          ownerId: user.id,
        })
        .returning();

      // Add the user as a member
      await db
        .insert(teamsMemberships)
        .values({
          teamId: team.id,
          userId: user.id,
          role: 'owner',
        });

      console.log(`✓ Created team: ${team.name} (${team.id})`);
    }

    console.log(`Using team: ${team.name} (${team.id})`);

    // Use the seed function from lib/seed.ts
    const result = await createCatalystAndMezeProjects(team.id);

    // Log results
    if (result.catalystProject) {
      console.log(`✅ Created/Updated Catalyst project: ${result.catalystProject.id}`);
    } else {
      console.log('ℹ️  Catalyst project already exists');
    }

    if (result.mezeProject) {
      console.log(`✅ Created/Updated Meze project: ${result.mezeProject.id}`);
    } else {
      console.log('ℹ️  Meze project already exists');
    }

    if (result.catalystRepo) {
      console.log(`✅ Created/Updated Catalyst repo: ${result.catalystRepo.id}`);
    } else {
      console.log('ℹ️  Catalyst repo already exists');
    }

    if (result.mezeRepo) {
      console.log(`✅ Created/Updated Meze repo: ${result.mezeRepo.id}`);
    } else {
      console.log('ℹ️  Meze repo already exists');
    }

    console.log('\n✨ Projects seeded successfully!');
    console.log('You can now view them at http://localhost:3000/projects');

  } catch (error) {
    console.error('❌ Error seeding projects:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedProjects();