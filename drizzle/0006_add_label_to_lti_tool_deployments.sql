CREATE TABLE "lti_context" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" varchar,
	"title" varchar
);
--> statement-breakpoint
CREATE TABLE "lti_contexts_types" (
	"context_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	CONSTRAINT "lti_contexts_types_context_id_type_pk" PRIMARY KEY("context_id","type")
);
--> statement-breakpoint
CREATE TABLE "lti_resource_link" (
	"id" uuid PRIMARY KEY NOT NULL,
	"deployment_id" uuid NOT NULL,
	"context_id" uuid,
	"resource_url" varchar NOT NULL,
	"title" varchar,
	"description" varchar
);
--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD COLUMN "label" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "lti_contexts_types" ADD CONSTRAINT "lti_contexts_types_context_id_lti_context_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."lti_context"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_link" ADD CONSTRAINT "lti_resource_link_deployment_id_lti_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."lti_deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_resource_link" ADD CONSTRAINT "lti_resource_link_context_id_lti_context_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."lti_context"("id") ON DELETE no action ON UPDATE no action;