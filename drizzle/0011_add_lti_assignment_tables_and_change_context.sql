CREATE TYPE "public"."concrete_context_type_e" AS ENUM('course');--> statement-breakpoint
CREATE TABLE "external_lti_resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tool_id" varchar NOT NULL,
	"external_tool_resource_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lti_assignments" (
	"assignment_id" uuid NOT NULL,
	"resource_link_id" uuid NOT NULL,
	CONSTRAINT "lti_assignments_assignment_id_resource_link_id_pk" PRIMARY KEY("assignment_id","resource_link_id")
);
--> statement-breakpoint
ALTER TABLE "lti_contexts_types" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "lti_contexts_types" CASCADE;--> statement-breakpoint
ALTER TABLE "lti_context" RENAME COLUMN "id" TO "concreteContextId";--> statement-breakpoint
ALTER TABLE "lti_resource_link" DROP CONSTRAINT "lti_resource_link_context_id_lti_context_id_fk";
--> statement-breakpoint
ALTER TABLE "lti_context" ADD CONSTRAINT "lti_context_concreteContextId_concrete_context_type_pk" PRIMARY KEY("concreteContextId","concrete_context_type");--> statement-breakpoint
ALTER TABLE "lti_context" ADD COLUMN "concrete_context_type" "concrete_context_type_e" NOT NULL;--> statement-breakpoint
ALTER TABLE "lti_context" ADD COLUMN "parent_context_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_context" ADD COLUMN "parent_context_type" "concrete_context_type_e";--> statement-breakpoint
ALTER TABLE "lti_resource_link" ADD COLUMN "concrete_context_type" "concrete_context_type_e";--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD COLUMN "context_id" uuid;--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD COLUMN "context_concrete_type" "concrete_context_type_e";--> statement-breakpoint
ALTER TABLE "external_lti_resources" ADD CONSTRAINT "external_lti_resources_tool_id_lti_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."lti_tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_assignments" ADD CONSTRAINT "lti_assignments_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_assignments" ADD CONSTRAINT "lti_assignments_resource_link_id_lti_resource_link_id_fk" FOREIGN KEY ("resource_link_id") REFERENCES "public"."lti_resource_link"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_context" ADD CONSTRAINT "lti_context_parent_context_id_parent_context_type_lti_context_concreteContextId_concrete_context_type_fk" FOREIGN KEY ("parent_context_id","parent_context_type") REFERENCES "public"."lti_context"("concreteContextId","concrete_context_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_link" ADD CONSTRAINT "lti_resource_link_concrete_context_type_context_id_lti_context_concrete_context_type_concreteContextId_fk" FOREIGN KEY ("concrete_context_type","context_id") REFERENCES "public"."lti_context"("concrete_context_type","concreteContextId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD CONSTRAINT "lti_deployments_context_id_context_concrete_type_lti_context_concreteContextId_concrete_context_type_fk" FOREIGN KEY ("context_id","context_concrete_type") REFERENCES "public"."lti_context"("concreteContextId","concrete_context_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_context" DROP COLUMN "label";--> statement-breakpoint
ALTER TABLE "lti_context" DROP COLUMN "title";