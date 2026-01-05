CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"from_item_id" uuid NOT NULL,
	"to_item_id" uuid NOT NULL,
	"type" text DEFAULT 'depends_on' NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"run_id" uuid,
	"span_id" uuid,
	"parent_id" uuid,
	"visibility" text DEFAULT 'visible' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"request_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"run_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"resume_token" text,
	"last_event_id" text,
	"snapshot" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"scope_type" text,
	"scope_id" text,
	"title" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type_id" text NOT NULL,
	"content" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_from_item_id_items_id_fk" FOREIGN KEY ("from_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_to_item_id_items_id_fk" FOREIGN KEY ("to_item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_edges_thread" ON "edges" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_edges_from" ON "edges" USING btree ("from_item_id");--> statement-breakpoint
CREATE INDEX "idx_edges_to" ON "edges" USING btree ("to_item_id");--> statement-breakpoint
CREATE INDEX "idx_items_thread" ON "items" USING btree ("thread_id","id");--> statement-breakpoint
CREATE INDEX "idx_items_run" ON "items" USING btree ("thread_id","run_id");--> statement-breakpoint
CREATE INDEX "idx_items_span" ON "items" USING btree ("thread_id","span_id");--> statement-breakpoint
CREATE INDEX "idx_streams_thread" ON "streams" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_streams_status" ON "streams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_threads_scope" ON "threads" USING btree ("project_id","scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "idx_threads_project" ON "threads" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_documents_project" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "documents" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "idx_documents_project_type" ON "documents" USING btree ("project_id","type_id");