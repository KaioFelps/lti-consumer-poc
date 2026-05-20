CREATE TABLE "lti_line_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" varchar NOT NULL,
	"score_maximum" smallint NOT NULL,
	"externalResourceId" uuid,
	"context_type" "concrete_context_type_e",
	"context_id" uuid,
	"tag" varchar,
	"start_date_time" timestamp with time zone,
	"end_date_time" timestamp with time zone,
	"grades_released" boolean,
	"custom_parameters" jsonb,
	"ltiAssignmentId" uuid
);
--> statement-breakpoint
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_externalResourceId_external_lti_resources_id_fk" FOREIGN KEY ("externalResourceId") REFERENCES "public"."external_lti_resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_ltiAssignmentId_lti_assignments_assignment_id_fk" FOREIGN KEY ("ltiAssignmentId") REFERENCES "public"."lti_assignments"("assignment_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_line_items" ADD CONSTRAINT "lti_line_items_context_id_context_type_lti_context_concrete_context_id_concrete_context_type_fk" FOREIGN KEY ("context_id","context_type") REFERENCES "public"."lti_context"("concrete_context_id","concrete_context_type") ON DELETE no action ON UPDATE no action;