#!/usr/bin/env node
/**
 * Script to seed the database with catalyst and meze projects
 *
 * Usage:
 *   make seed-projects  (recommended - runs in Docker container with proper env)
 *   npm run seed:projects
 *   npx tsx src/scripts/seed-projects.ts
 */

import "dotenv/config";
import { createCatalystAndMezeProjects } from "../lib/seed.js";
import { db } from "../db/index.js";
import { teams, users, teamsMemberships } from "../db/schema.js";

async function seedProjects() {
  console.log("🌱 Starting to seed catalyst and meze projects...");

  try {
    console.log("🔌 Connecting to database...");

    // Get all teams
    const allTeams = await db.select().from(teams);

    if (allTeams.length === 0) {
      console.log("No teams found. Creating a default team...");

      // Check if there's a user to assign as owner
      const [user] = await db.select().from(users).limit(1);

      if (!user) {
        console.error(
          "❌ No users found. Please create a user first by logging into the application.",
        );
        process.exit(1);
      }

      // Create a default team
      const [team] = await db
        .insert(teams)
        .values({
          name: "Default Team",
          description: "Default team for seeded projects",
          ownerId: user.id,
        })
        .returning();

      // Add the user as a member
      await db.insert(teamsMemberships).values({
        teamId: team.id,
        userId: user.id,
        role: "owner",
      });

      console.log(`✓ Created team: ${team.name} (${team.id})`);
      allTeams.push(team);
    }

    // Seed projects for all teams
    for (const team of allTeams) {
      console.log(`\nSeeding for team: ${team.name} (${team.id})`);

      // Use the seed function from lib/seed.ts
      const result = await createCatalystAndMezeProjects(team.id);

      // Log results
      if (result.catalystProject) {
        console.log(`  ✅ Catalyst project: ${result.catalystProject.id}`);
      }

      if (result.mezeProject) {
        console.log(`  ✅ Meze project: ${result.mezeProject.id}`);
      }

      if (result.catalystRepo) {
        console.log(`  ✅ Catalyst repo: ${result.catalystRepo.id}`);
      }

      if (result.mezeRepo) {
        console.log(`  ✅ Meze repo: ${result.mezeRepo.id}`);
      }
    }

    console.log("\n✨ Projects seeded successfully for all teams!");
    console.log("You can now view them at http://localhost:3000/projects");
  } catch (error) {
    console.error("❌ Error seeding projects:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed function
seedProjects();
