-- Add domain and ingress configuration to projects table
ALTER TABLE "project" ADD COLUMN "custom_domain" text;
ALTER TABLE "project" ADD COLUMN "ingress_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "project" ADD COLUMN "tls_enabled" boolean DEFAULT false NOT NULL;
