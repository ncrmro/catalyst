-- Add slug column as nullable first
ALTER TABLE "project" ADD COLUMN "slug" text;

-- Generate slugs from name: lowercase, replace non-alphanumeric with hyphens, trim hyphens
UPDATE "project" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g'));

-- Handle empty slugs (fallback to id prefix)
UPDATE "project" SET "slug" = 'project-' || SUBSTRING(id, 1, 8) WHERE "slug" IS NULL OR "slug" = '';

-- Make slug NOT NULL after populating
ALTER TABLE "project" ALTER COLUMN "slug" SET NOT NULL;

--> statement-breakpoint
CREATE UNIQUE INDEX "project_slug_team_id_unique" ON "project" USING btree ("slug","team_id");
