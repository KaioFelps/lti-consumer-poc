ALTER TABLE "lti_assignments" DROP CONSTRAINT "lti_assignments_assignment_id_resource_link_id_pk";--> statement-breakpoint
ALTER TABLE "lti_assignments" ADD PRIMARY KEY ("assignment_id");