CREATE TABLE "github_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"account_login" text NOT NULL,
	"account_type" text NOT NULL,
	"target_type" text NOT NULL,
	"permissions" text,
	"events" text,
	"single_file_name" text,
	"has_multiple_single_files" boolean DEFAULT false,
	"suspended_by" text,
	"suspended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE "installation_repositories" (
	"id" text PRIMARY KEY NOT NULL,
	"installation_id" text NOT NULL,
	"repository_id" integer NOT NULL,
	"repository_name" text NOT NULL,
	"repository_full_name" text NOT NULL,
	"private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_github_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"installation_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "installation_repositories" ADD CONSTRAINT "installation_repositories_installation_id_github_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_github_installations" ADD CONSTRAINT "user_github_installations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_github_installations" ADD CONSTRAINT "user_github_installations_installation_id_github_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("id") ON DELETE cascade ON UPDATE no action;