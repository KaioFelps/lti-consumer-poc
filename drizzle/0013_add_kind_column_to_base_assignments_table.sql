CREATE TYPE "public"."assignment_kind_e" AS ENUM('local', 'external_lti');--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "kind" "assignment_kind_e" DEFAULT 'local' NOT NULL;

-- update `kind` column from assignments that are actually external assignments
UPDATE "assignments"
SET "kind" = 'external_lti'
WHERE "id" IN (
    SELECT "assignment_id" 
    FROM "lti_assignments"
);
