CREATE INDEX "idx_pod_status" ON "pull_request_pods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pod_namespace" ON "pull_request_pods" USING btree ("namespace");