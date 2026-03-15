CREATE TABLE "cloud_resource_usage_records" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"cloud_account_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"usage_hour" timestamp NOT NULL,
	"reported_to_stripe" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloud_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"external_account_id" text NOT NULL,
	"credential_type" text NOT NULL,
	"credential_encrypted" text NOT NULL,
	"credential_iv" text NOT NULL,
	"credential_auth_tag" text NOT NULL,
	"resource_prefix" text,
	"last_validated_at" timestamp,
	"last_error" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managed_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"cloud_account_id" text NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"region" text NOT NULL,
	"kubernetes_version" text NOT NULL,
	"config" jsonb,
	"kubeconfig_encrypted" text,
	"kubeconfig_iv" text,
	"kubeconfig_auth_tag" text,
	"deletion_protection" boolean DEFAULT true NOT NULL,
	"delete_grace_period_ends" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "node_pools" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text NOT NULL,
	"name" text NOT NULL,
	"instance_type" text NOT NULL,
	"min_nodes" integer DEFAULT 1 NOT NULL,
	"max_nodes" integer DEFAULT 3 NOT NULL,
	"current_nodes" integer DEFAULT 0 NOT NULL,
	"spot_enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloud_resource_usage_records" ADD CONSTRAINT "cloud_resource_usage_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_accounts" ADD CONSTRAINT "cloud_accounts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloud_accounts" ADD CONSTRAINT "cloud_accounts_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_clusters" ADD CONSTRAINT "managed_clusters_cloud_account_id_cloud_accounts_id_fk" FOREIGN KEY ("cloud_account_id") REFERENCES "public"."cloud_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_clusters" ADD CONSTRAINT "managed_clusters_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_clusters" ADD CONSTRAINT "managed_clusters_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_pools" ADD CONSTRAINT "node_pools_cluster_id_managed_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."managed_clusters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_resource_usage_idempotent" ON "cloud_resource_usage_records" USING btree ("team_id","resource_type","resource_id","usage_hour");--> statement-breakpoint
CREATE UNIQUE INDEX "cloud_accounts_team_provider_external_unique" ON "cloud_accounts" USING btree ("team_id","provider","external_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "managed_clusters_cloud_account_name_unique" ON "managed_clusters" USING btree ("cloud_account_id","name");