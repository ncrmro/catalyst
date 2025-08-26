CREATE TABLE "periodic_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"projects_analysis" text NOT NULL,
	"clusters_analysis" text NOT NULL,
	"recommendations" text NOT NULL,
	"next_steps" text NOT NULL,
	"is_fallback" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
