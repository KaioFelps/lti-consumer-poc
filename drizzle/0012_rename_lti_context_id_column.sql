ALTER TABLE "lti_context" RENAME COLUMN "concreteContextId" TO "concrete_context_id";--> statement-breakpoint
ALTER TABLE "lti_context" DROP CONSTRAINT "lti_context_parent_context_id_parent_context_type_lti_context_concreteContextId_concrete_context_type_fk";
--> statement-breakpoint
ALTER TABLE "lti_resource_link" DROP CONSTRAINT "lti_resource_link_concrete_context_type_context_id_lti_context_concrete_context_type_concreteContextId_fk";
--> statement-breakpoint
ALTER TABLE "lti_deployments" DROP CONSTRAINT "lti_deployments_context_id_context_concrete_type_lti_context_concreteContextId_concrete_context_type_fk";
--> statement-breakpoint
ALTER TABLE "lti_context" DROP CONSTRAINT "lti_context_concreteContextId_concrete_context_type_pk";--> statement-breakpoint
ALTER TABLE "lti_context" ADD CONSTRAINT "lti_context_concrete_context_id_concrete_context_type_pk" PRIMARY KEY("concrete_context_id","concrete_context_type");--> statement-breakpoint
ALTER TABLE "lti_context" ADD CONSTRAINT "lti_context_parent_context_id_parent_context_type_lti_context_concrete_context_id_concrete_context_type_fk" FOREIGN KEY ("parent_context_id","parent_context_type") REFERENCES "public"."lti_context"("concrete_context_id","concrete_context_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_link" ADD CONSTRAINT "lti_resource_link_concrete_context_type_context_id_lti_context_concrete_context_type_concrete_context_id_fk" FOREIGN KEY ("concrete_context_type","context_id") REFERENCES "public"."lti_context"("concrete_context_type","concrete_context_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD CONSTRAINT "lti_deployments_context_id_context_concrete_type_lti_context_concrete_context_id_concrete_context_type_fk" FOREIGN KEY ("context_id","context_concrete_type") REFERENCES "public"."lti_context"("concrete_context_id","concrete_context_type") ON DELETE no action ON UPDATE no action;