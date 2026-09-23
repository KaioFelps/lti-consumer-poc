CREATE TYPE "public"."lti_score_activity_progress_e" AS ENUM('Initialized', 'Started', 'InProgress', 'Submitted', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."lti_score_grading_progress_e" AS ENUM('Failed', 'FullyGraded', 'NotReady', 'Pending', 'PendingManual');--> statement-breakpoint
CREATE TABLE "lti_scores" (
	"line_item_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scoring_user_id" uuid,
	"activity_progress" "lti_score_activity_progress_e" NOT NULL,
	"grading_progress" "lti_score_grading_progress_e" NOT NULL,
	"timestamp" timestamp (3) with time zone NOT NULL,
	"comment" varchar(600),
	"started_at" timestamp (6) with time zone,
	"submitted_at" timestamp (6) with time zone,
	"score_given" double precision,
	"score_maximum" double precision,
	"custom_parameters" jsonb,
	CONSTRAINT "lti_scores_pk" PRIMARY KEY("user_id","line_item_id")
);
--> statement-breakpoint
ALTER TABLE "lti_scores" ADD CONSTRAINT "lti_scores_line_item_id_lti_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "public"."lti_line_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_scores" ADD CONSTRAINT "lti_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_scores" ADD CONSTRAINT "lti_scores_scoring_user_id_users_id_fk" FOREIGN KEY ("scoring_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;