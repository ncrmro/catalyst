#!/usr/bin/env tsx
/**
 * Test script to verify fixtures are properly set up and validated
 */

import {
  reposFixtures,
  projectsFixtures,
  usersFixtures,
  validateFixtures,
  type RepoFixture,
  type ProjectFixture,
  type UserFixture,
} from "../src/lib/fixtures";

console.log("🧪 Testing Fixtures...\n");

try {
  // Test validation
  console.log("✓ Validating fixtures...");
  validateFixtures();
  console.log("✅ All fixtures validated successfully\n");

  // Test repos
  console.log("📦 Repository Fixtures:");
  console.log(`  Count: ${reposFixtures.length}`);
  reposFixtures.forEach((repo: RepoFixture) => {
    console.log(`  - ${repo.fullName} (${repo.language})`);
  });
  console.log();

  // Test projects
  console.log("🚀 Project Fixtures:");
  console.log(`  Count: ${projectsFixtures.length}`);
  projectsFixtures.forEach((project: ProjectFixture) => {
    console.log(`  - ${project.name}: ${project.description}`);
  });
  console.log();

  // Test users
  console.log("👤 User Fixtures:");
  console.log(`  Count: ${usersFixtures.length}`);
  usersFixtures.forEach((user: UserFixture) => {
    console.log(`  - ${user.email} (${user.admin ? "admin" : "user"})`);
  });
  console.log();

  console.log("✅ All fixture tests passed!");
  process.exit(0);
} catch (error) {
  console.error("❌ Fixture test failed:");
  console.error(error);
  process.exit(1);
}
