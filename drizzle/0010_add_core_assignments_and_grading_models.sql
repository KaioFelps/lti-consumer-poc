CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"course_id" uuid,
	"title" varchar(400) NOT NULL,
	"max_score" smallint NOT NULL,
	"released_at" timestamp with time zone,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(400) NOT NULL,
	"instructor_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"concluded_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "enrollments_student_id_course_id_pk" PRIMARY KEY("student_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"assignment_id" uuid NOT NULL,
	"score" smallint DEFAULT 0 NOT NULL,
	"max_score" smallint NOT NULL,
	"released" boolean DEFAULT false NOT NULL,
	"last_updated_at" timestamp with time zone,
	"graded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grades_student_id_course_id_assignment_id_pk" PRIMARY KEY("student_id","course_id","assignment_id")
);
--> statement-breakpoint
CREATE TABLE "student_assignments" (
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"released_at" timestamp with time zone,
	"assignedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_assignments_assignment_id_student_id_pk" PRIMARY KEY("assignment_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_course_id_enrollments_student_id_course_id_fk" FOREIGN KEY ("student_id","course_id") REFERENCES "public"."enrollments"("student_id","course_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_assignments" ADD CONSTRAINT "student_assignments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;