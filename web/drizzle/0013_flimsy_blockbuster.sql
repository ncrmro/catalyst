ALTER TABLE "pull_request_pods" ALTER COLUMN "pull_request_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_request_pods" ADD COLUMN "source" text DEFAULT 'pull_request' NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_request_pods" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "pull_request_pods" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "pull_request_pods" ADD CONSTRAINT "pull_request_pods_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pod_source" ON "pull_request_pods" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_pod_expires_at" ON "pull_request_pods" USING btree ("expires_at");