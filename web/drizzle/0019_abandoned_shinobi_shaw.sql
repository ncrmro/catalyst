ALTER TABLE "teams" ADD COLUMN "vcs_provider_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "vcs_org_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "vcs_org_login" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "vcs_org_avatar_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_vcs_org" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "teams_vcs_provider_org_unique" ON "teams" USING btree ("vcs_provider_id","vcs_org_id");--> statement-breakpoint
CREATE INDEX "teams_vcs_provider_login_idx" ON "teams" USING btree ("vcs_provider_id","vcs_org_login");