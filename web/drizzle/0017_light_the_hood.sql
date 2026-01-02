CREATE TABLE "convention_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"rule_type" text NOT NULL,
	"rule_name" text NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"slug" text NOT NULL,
	"spec_number" integer NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"spec_folder_id" text NOT NULL,
	"task_id" text NOT NULL,
	"user_story_ref" text,
	"description" text NOT NULL,
	"is_parallelizable" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"linked_pr_number" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"task_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"linked_pr_number" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_contexts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"content_hash" text NOT NULL,
	"generated_content" text NOT NULL,
	"last_generated_at" timestamp DEFAULT now() NOT NULL,
	"needs_refresh" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"signal_type" text NOT NULL,
	"threshold" numeric(10, 4) NOT NULL,
	"operator" text NOT NULL,
	"duration" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "convention_rules" ADD CONSTRAINT "convention_rules_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_folders" ADD CONSTRAINT "spec_folders_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_tasks" ADD CONSTRAINT "spec_tasks_spec_folder_id_spec_folders_id_fk" FOREIGN KEY ("spec_folder_id") REFERENCES "public"."spec_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_tasks" ADD CONSTRAINT "platform_tasks_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_contexts" ADD CONSTRAINT "agent_contexts_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;