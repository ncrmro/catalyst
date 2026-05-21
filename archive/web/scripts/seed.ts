#!/usr/bin/env tsx

/**
 * Database seeding script
 */

// Load environment variables
import "dotenv/config";
import { seedDefaultUsers } from "@/lib/seed";

type SeedResult = {
  success: boolean;
  message: string;
  results?: Array<{
    success: boolean;
    message: string;
    data?: {
      userId?: string;
      userEmail?: string;
      teamId?: string;
      projectsCount?: number;
      repositoriesCount?: number;
    };
  }>;
};

async function main(): Promise<void> {
  try {
    console.log("Starting database seeding...");

    // seedDefaultUsers now automatically handles mocked vs non-mocked mode
    const result = (await seedDefaultUsers()) as SeedResult;

    if (result.success) {
      console.log("Database seeding completed successfully!");
      console.log(result.message);

      if (result.results) {
        result.results.forEach((r, i) => {
          console.log(`User ${i + 1}: ${r.message}`);
          if (r.data) {
            if (r.data.userEmail) console.log(`  Email: ${r.data.userEmail}`);
            if (r.data.projectsCount) {
              console.log(`  Projects: ${r.data.projectsCount}`);
              console.log(`  Repositories: ${r.data.repositoriesCount}`);
            }
          }
        });
      }
    } else {
      console.error("Error seeding database:", result.message);
    }

    process.exit(0);
  } catch (error) {
    console.error(
      "Error seeding database:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
