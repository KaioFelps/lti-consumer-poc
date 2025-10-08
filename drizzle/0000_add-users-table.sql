CREATE TYPE "public"."person_gender" AS ENUM('female', 'male', 'non binary');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('administrator', 'user');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_hash" varchar(120) NOT NULL,
	"profile_picture_url" varchar(255),
	"system_role" "system_role" DEFAULT 'user' NOT NULL,
	"cpf" varchar(11),
	"birth_date" timestamp with time zone,
	"gender" "person_gender",
	"first_name" varchar(255),
	"surname" varchar(255),
	CONSTRAINT "users_id_not_null" CHECK (NOT NULL id),
	CONSTRAINT "users_username_not_null" CHECK (NOT NULL username),
	CONSTRAINT "users_password_hash_not_null" CHECK (NOT NULL password_hash),
	CONSTRAINT "users_system_role_not_null" CHECK (NOT NULL system_role)
);
