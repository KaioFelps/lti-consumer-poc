import { relations } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { PersonGender } from "@/identity/person/enums/gender";
import { SystemRole } from "@/identity/user/enums/system-role";

export const systemRoleEnum = pgEnum("system_role", [
  SystemRole.Admin,
  SystemRole.User,
]);

export const personGenderEnum = pgEnum("person_gender", [
  PersonGender.Female,
  PersonGender.Male,
  PersonGender.NonBinary,
]);

export const usersTable = pgTable("users", {
  // user fields
  id: uuid().primaryKey(),
  username: varchar({ length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 120 }).notNull(),
  profilePictureUrl: varchar("profile_picture_url", { length: 255 }),
  systemRole: systemRoleEnum("system_role").default(SystemRole.User).notNull(),
  // person specific fields
  //
  // not unique on purpose: in case an user be deactivated at some point,
  // a new user can still be created with this CPF. Suppose a student
  // finishes the Ensino Médio but further on becomes a professor or
  // a parent and need to get a new account on the same school he once was
  // a student...
  //
  // Not any of these can be not null at database because we need to enforce
  // composition. Required fields MUST be required at software level.
  cpf: varchar({ length: 11 }),
  birthDate: timestamp("birth_date", { withTimezone: true }),
  gender: personGenderEnum(),
  firstName: varchar("first_name", { length: 255 }),
  surname: varchar({ length: 255 }),
  email: varchar({ length: 255 }).unique(),
});

export const oauthApplicationTypeEnum = pgEnum("oauth_application_type", [
  "web",
  "native",
]);

export const oauthClients = pgTable("oauth_client", {
  id: varchar({ length: 64 }).primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  clientSecret: varchar("client_secret"),
  scopes: varchar().notNull(),
  jwksUri: varchar("jwks_uri").notNull(),
  applicationType: oauthApplicationTypeEnum("application_type").notNull(),
});

export const ltiTools = pgTable("lti_tools", {
  id: varchar({ length: 64 })
    .primaryKey()
    .references(() => oauthClients.id, { onDelete: "cascade" }),
  description: varchar(),
  domain: varchar().notNull(),
  customParameters: jsonb("custom_parameters"),
  responseTypes: varchar("response_types").notNull(),
  initiateUri: varchar("initiate_uri").notNull(),
  targetLinkUri: varchar("target_link_uri").notNull(),
  claims: varchar().notNull(),
  grantTypes: varchar("grant_type").notNull(),
  policyUri: varchar("policy_uri"),
  logoUri: varchar("logo_uri"),
  homePageUri: varchar("home_page_uri"),
  tosUri: varchar("tos_uri"),
});

export const oauthRedirectUris = pgTable(
  "oauth_redirect_uris",
  {
    clientId: varchar("client_id", { length: 64 })
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    uri: varchar().notNull(),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.uri] })],
);

export const oauthContacts = pgTable(
  "oauth_contacts",
  {
    clientId: varchar("client_id", { length: 64 })
      .notNull()
      .references(() => oauthClients.id, { onDelete: "cascade" }),
    email: varchar().notNull(),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.email] })],
);

export const ltiToolDeployments = pgTable("lti_deployments", {
  clientId: varchar("client_id", { length: 64 })
    .notNull()
    .references(() => ltiTools.id, { onDelete: "cascade" }),
  id: uuid().primaryKey(),
});

export const ltiToolSupportedMessages = pgTable(
  "lti_tool_supported_messages",
  {
    clientId: varchar("client_id", { length: 64 })
      .notNull()
      .references(() => ltiTools.id, { onDelete: "cascade" }),
    type: varchar().notNull(),
    targetLinkUri: varchar("target_link_uri"),
    label: varchar(),
    iconUri: varchar("icon_uri"),
    placements: varchar(),
    customParameters: jsonb("custom_parameters"),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.type] })],
);

export const ltiToolSupportedMessageRoles = pgTable(
  "lti_tool_supported_message_role",
  {
    clientId: varchar("client_id", { length: 64 })
      .notNull()
      .references(() => ltiTools.id, { onDelete: "cascade" }),
    messageType: varchar("msg_type").notNull(),
    role: varchar().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.clientId, table.messageType, table.role] }),
  ],
);

/**
 * Relations
 */
export const ltiToolsRelations = relations(ltiTools, ({ many, one }) => ({
  oauthClient: one(oauthClients, {
    fields: [ltiTools.id],
    references: [oauthClients.id],
  }),
  deployments: many(ltiToolDeployments),
  supportedMessages: many(ltiToolSupportedMessages),
}));

export const ltiToolDeploymentsRelations = relations(
  ltiToolDeployments,
  ({ one }) => ({
    tool: one(ltiTools, {
      fields: [ltiToolDeployments.clientId],
      references: [ltiTools.id],
    }),
  }),
);

export const ltiToolSupportedMessagesRelations = relations(
  ltiToolSupportedMessages,
  ({ one, many }) => ({
    tool: one(ltiTools, {
      fields: [ltiToolSupportedMessages.clientId],
      references: [ltiTools.id],
    }),
    roles: many(ltiToolSupportedMessageRoles),
  }),
);

export const ltiToolSupportedMessageRolesRelations = relations(
  ltiToolSupportedMessageRoles,
  ({ one }) => ({
    message: one(ltiToolSupportedMessages, {
      fields: [
        ltiToolSupportedMessageRoles.clientId,
        ltiToolSupportedMessageRoles.messageType,
      ],
      references: [
        ltiToolSupportedMessages.clientId,
        ltiToolSupportedMessages.type,
      ],
    }),
  }),
);

export const oauthClientRelations = relations(
  oauthClients,
  ({ one, many }) => ({
    ltiTool: one(ltiTools),
    redirectUris: many(oauthRedirectUris),
    contacts: many(oauthContacts),
  }),
);

export const oauthRedirectUrisRelations = relations(
  oauthRedirectUris,
  ({ one }) => ({
    client: one(oauthClients, {
      fields: [oauthRedirectUris.clientId],
      references: [oauthClients.id],
    }),
  }),
);

export const oauthContactsRelations = relations(oauthContacts, ({ one }) => ({
  client: one(oauthClients, {
    fields: [oauthContacts.clientId],
    references: [oauthClients.id],
  }),
}));
