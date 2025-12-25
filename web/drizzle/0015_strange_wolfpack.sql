ALTER TABLE "project" ADD COLUMN "custom_domain" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "tls_cluster_issuer" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "ingress_class_name" text;