ALTER TABLE "lti_resource_link" DROP CONSTRAINT "lti_resource_link_deployment_id_lti_deployments_id_fk";
--> statement-breakpoint
ALTER TABLE "lti_resource_link" ADD CONSTRAINT "lti_resource_link_deployment_id_lti_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."lti_deployments"("id") ON DELETE cascade ON UPDATE no action;