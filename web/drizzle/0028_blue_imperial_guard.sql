CREATE TABLE "forgejo_user_tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"instance_url" text NOT NULL,
	"access_token_encrypted" text,
	"access_token_iv" text,
	"access_token_auth_tag" text,
	"refresh_token_encrypted" text,
	"refresh_token_iv" text,
	"refresh_token_auth_tag" text,
	"token_expires_at" timestamp,
	"token_scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forgejo_user_tokens" ADD CONSTRAINT "forgejo_user_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;