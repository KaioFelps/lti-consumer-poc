ALTER TABLE "lti_deployments" DROP CONSTRAINT "lti_deployments_client_id_id_pk";--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD PRIMARY KEY ("id");