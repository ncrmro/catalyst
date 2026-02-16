CREATE TABLE "stripe_customers" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"usage_date" date NOT NULL,
	"active_environment_count" integer DEFAULT 0 NOT NULL,
	"spundown_environment_count" integer DEFAULT 0 NOT NULL,
	"billable_active_count" integer DEFAULT 0 NOT NULL,
	"billable_spundown_count" integer DEFAULT 0 NOT NULL,
	"reported_to_stripe" boolean DEFAULT false NOT NULL,
	"reported_at" timestamp,
	"report_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_customers_team_id_unique" ON "stripe_customers" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_subscriptions_team_id_active_unique" ON "stripe_subscriptions" USING btree ("team_id") WHERE status IN ('active', 'trialing', 'past_due', 'incomplete');--> statement-breakpoint
CREATE UNIQUE INDEX "usage_records_team_date_unique" ON "usage_records" USING btree ("team_id","usage_date");