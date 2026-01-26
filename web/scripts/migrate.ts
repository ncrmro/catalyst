#!/usr/bin/env tsx
/**
 * Database migration script using drizzle-orm's programmatic API
 * This replaces drizzle-kit CLI for production use
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log("Running migrations...");
  const db = drizzle(databaseUrl);

  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("Migrations completed successfully");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
