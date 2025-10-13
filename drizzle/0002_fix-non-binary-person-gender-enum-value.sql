ALTER TABLE "users" ALTER COLUMN "gender" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."person_gender";--> statement-breakpoint
CREATE TYPE "public"."person_gender" AS ENUM('female', 'male', 'non-binary');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "gender" SET DATA TYPE "public"."person_gender" USING "gender"::"public"."person_gender";