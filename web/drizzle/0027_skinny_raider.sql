-- Step 1: Make github_id nullable for future non-GitHub repos
ALTER TABLE "repo" ALTER COLUMN "github_id" DROP NOT NULL;--> statement-breakpoint

-- Step 2: Add provider column with default 'github' for existing repos
ALTER TABLE "repo" ADD COLUMN "provider" text DEFAULT 'github' NOT NULL;--> statement-breakpoint

-- Step 3: Add provider_id column as nullable initially
ALTER TABLE "repo" ADD COLUMN "provider_id" text;--> statement-breakpoint

-- Step 4: Backfill provider_id from github_id for existing repos
UPDATE "repo" SET "provider_id" = CAST("github_id" AS text) WHERE "github_id" IS NOT NULL;--> statement-breakpoint

-- Step 5: Now make provider_id NOT NULL since all existing rows have values
ALTER TABLE "repo" ALTER COLUMN "provider_id" SET NOT NULL;--> statement-breakpoint

-- Step 6: Create unique index on provider + provider_id + team_id
CREATE UNIQUE INDEX "repo_provider_id_team_id_unique" ON "repo" USING btree ("provider","provider_id","team_id");