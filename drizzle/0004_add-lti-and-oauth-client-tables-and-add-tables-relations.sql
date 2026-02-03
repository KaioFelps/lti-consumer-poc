CREATE TYPE "public"."oauth_application_type" AS ENUM('web', 'native');--> statement-breakpoint
CREATE TABLE "lti_deployments" (
	"client_id" varchar(64) NOT NULL,
	"id" uuid NOT NULL,
	CONSTRAINT "lti_deployments_client_id_id_pk" PRIMARY KEY("client_id","id")
);
--> statement-breakpoint
CREATE TABLE "lti_tool_supported_message_role" (
	"client_id" varchar(64) NOT NULL,
	"msg_type" varchar NOT NULL,
	"role" varchar NOT NULL,
	CONSTRAINT "lti_tool_supported_message_role_client_id_msg_type_role_pk" PRIMARY KEY("client_id","msg_type","role")
);
--> statement-breakpoint
CREATE TABLE "lti_tool_supported_messages" (
	"client_id" varchar(64) NOT NULL,
	"type" varchar NOT NULL,
	"target_link_uri" varchar,
	"label" varchar,
	"icon_uri" varchar,
	"placements" varchar,
	"custom_parameters" jsonb,
	CONSTRAINT "lti_tool_supported_messages_client_id_type_pk" PRIMARY KEY("client_id","type")
);
--> statement-breakpoint
CREATE TABLE "lti_tools" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"description" varchar,
	"domain" varchar NOT NULL,
	"custom_parameters" jsonb,
	"response_types" varchar NOT NULL,
	"initiate_uri" varchar NOT NULL,
	"target_link_uri" varchar NOT NULL,
	"claims" varchar NOT NULL,
	"grant_type" varchar NOT NULL,
	"policy_uri" varchar,
	"logo_uri" varchar,
	"home_page_uri" varchar,
	"tos_uri" varchar
);
--> statement-breakpoint
CREATE TABLE "oauth_client" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"client_secret" varchar,
	"scopes" varchar NOT NULL,
	"jwks_uri" varchar NOT NULL,
	"application_type" "oauth_application_type" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_contacts" (
	"client_id" varchar(64) NOT NULL,
	"email" varchar NOT NULL,
	CONSTRAINT "oauth_contacts_client_id_email_pk" PRIMARY KEY("client_id","email")
);
--> statement-breakpoint
CREATE TABLE "oauth_redirect_uris" (
	"client_id" varchar(64) NOT NULL,
	"uri" varchar NOT NULL,
	CONSTRAINT "oauth_redirect_uris_client_id_uri_pk" PRIMARY KEY("client_id","uri")
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_username_not_null";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_password_hash_not_null";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_system_role_not_null";--> statement-breakpoint
ALTER TABLE "lti_deployments" ADD CONSTRAINT "lti_deployments_client_id_lti_tools_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."lti_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_tool_supported_message_role" ADD CONSTRAINT "lti_tool_supported_message_role_client_id_lti_tools_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."lti_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_tool_supported_messages" ADD CONSTRAINT "lti_tool_supported_messages_client_id_lti_tools_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."lti_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lti_tools" ADD CONSTRAINT "lti_tools_id_oauth_client_id_fk" FOREIGN KEY ("id") REFERENCES "public"."oauth_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_contacts" ADD CONSTRAINT "oauth_contacts_client_id_oauth_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_redirect_uris" ADD CONSTRAINT "oauth_redirect_uris_client_id_oauth_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("id") ON DELETE cascade ON UPDATE no action;