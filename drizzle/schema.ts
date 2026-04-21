import { relations } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { PersonGender } from "@/modules/identity/person/enums/gender";
import { SystemRole } from "@/modules/identity/user/enums/system-role";

export const systemRoleEnum = pgEnum("system_role", [SystemRole.Admin, SystemRole.User]);

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

// #region LTI & OAuth
export const oauthApplicationTypeEnum = pgEnum("oauth_application_type", ["web", "native"]);

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
  customParameters: jsonb("custom_parameters").$type<Record<string, string>>(),
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
  label: varchar({ length: 255 }).notNull(),
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
    customParameters: jsonb("custom_parameters").$type<Record<string, string>>(),
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
  (table) => [primaryKey({ columns: [table.clientId, table.messageType, table.role] })],
);

export const ltiContexts = pgTable("lti_context", {
  id: uuid().primaryKey(),
  label: varchar(),
  title: varchar(),
});

export const ltiContextsTypes = pgTable(
  "lti_contexts_types",
  {
    contextId: uuid("context_id")
      .notNull()
      .references(() => ltiContexts.id),
    type: varchar().notNull(),
  },
  (table) => [primaryKey({ columns: [table.contextId, table.type] })],
);

export const ltiResourceLinks = pgTable("lti_resource_link", {
  id: uuid().primaryKey(),
  deploymentId: uuid("deployment_id")
    .notNull()
    .references(() => ltiToolDeployments.id, { onDelete: "cascade" }),
  contextId: uuid("context_id").references(() => ltiContexts.id),
  resourceUrl: varchar("resource_url"),
  title: varchar(), // nullable
  description: varchar(), // nullable
  customParameters: jsonb("custom_parameters").$type<Record<string, string>>(),
});

// #endregion

// #region Assignments and Grading
export const coursesT = pgTable("courses", {
  id: uuid().primaryKey(),
  title: varchar({ length: 400 }).notNull(),
  instructorId: uuid("instructor_id")
    .references(() => usersTable.id)
    .notNull(),
});

export const enrollmentsT = pgTable(
  "enrollments",
  {
    studentId: uuid("student_id")
      .references(() => usersTable.id)
      .notNull(),
    courseId: uuid("course_id")
      .references(() => coursesT.id)
      .notNull(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    concludedAt: timestamp("concluded_at", { withTimezone: true }),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.studentId, table.courseId] })],
);

export const assignmentsT = pgTable("assignments", {
  id: uuid().primaryKey(),
  courseId: uuid("course_id").references(() => coursesT.id),
  title: varchar({ length: 400 }).notNull(),
  maxScore: smallint("max_score").notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  deadline: timestamp("deadline", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentsAssignmentsT = pgTable(
  "student_assignments",
  {
    assignmentId: uuid("assignment_id")
      .references(() => assignmentsT.id)
      .notNull(),
    studentId: uuid("student_id")
      .references(() => usersTable.id)
      .notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    assignedAt: timestamp("assignedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.assignmentId, table.studentId] })],
);

export const gradesT = pgTable(
  "grades",
  {
    studentId: uuid("student_id").notNull(),
    courseId: uuid("course_id").notNull(),
    assignmentId: uuid("assignment_id")
      .references(() => assignmentsT.id)
      .notNull(),
    score: smallint().notNull().default(0),
    maxScore: smallint("max_score").notNull(),
    released: boolean().notNull().default(false),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.studentId, table.courseId, table.assignmentId] }),
    foreignKey({
      columns: [table.studentId, table.courseId],
      foreignColumns: [enrollmentsT.studentId, enrollmentsT.courseId],
    }),
  ],
);

// #endregion

/***************************************
 * Relations
 ***************************************/

// #region LTI & OAuth
export const ltiToolsRelations = relations(ltiTools, ({ many, one }) => ({
  oauthClient: one(oauthClients, {
    fields: [ltiTools.id],
    references: [oauthClients.id],
  }),
  deployments: many(ltiToolDeployments),
  supportedMessages: many(ltiToolSupportedMessages),
}));

export const ltiToolDeploymentsRelations = relations(ltiToolDeployments, ({ one, many }) => ({
  tool: one(ltiTools, {
    fields: [ltiToolDeployments.clientId],
    references: [ltiTools.id],
  }),
  resourceLinks: many(ltiResourceLinks),
}));

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
      fields: [ltiToolSupportedMessageRoles.clientId, ltiToolSupportedMessageRoles.messageType],
      references: [ltiToolSupportedMessages.clientId, ltiToolSupportedMessages.type],
    }),
  }),
);

export const oauthClientRelations = relations(oauthClients, ({ one, many }) => ({
  ltiTool: one(ltiTools),
  redirectUris: many(oauthRedirectUris),
  contacts: many(oauthContacts),
}));

export const oauthRedirectUrisRelations = relations(oauthRedirectUris, ({ one }) => ({
  client: one(oauthClients, {
    fields: [oauthRedirectUris.clientId],
    references: [oauthClients.id],
  }),
}));

export const oauthContactsRelations = relations(oauthContacts, ({ one }) => ({
  client: one(oauthClients, {
    fields: [oauthContacts.clientId],
    references: [oauthClients.id],
  }),
}));

export const ltiResourceLinksRelations = relations(ltiResourceLinks, ({ one }) => ({
  deployment: one(ltiToolDeployments, {
    fields: [ltiResourceLinks.deploymentId],
    references: [ltiToolDeployments.id],
  }),
  context: one(ltiContexts, {
    fields: [ltiResourceLinks.contextId],
    references: [ltiContexts.id],
  }),
}));

export const ltiContextsRelations = relations(ltiContexts, ({ many }) => ({
  resourceLinks: many(ltiResourceLinks),
  types: many(ltiContextsTypes),
}));

export const ltiContextsTypesRelations = relations(ltiContextsTypes, ({ one }) => ({
  context: one(ltiContexts, {
    fields: [ltiContextsTypes.contextId],
    references: [ltiContexts.id],
  }),
}));

// #endregion

// #region Assignments and Grading
export const coursesRelations = relations(coursesT, ({ many, one }) => ({
  enrollments: many(enrollmentsT),
  instructor: one(usersTable, {
    fields: [coursesT.instructorId],
    references: [usersTable.id],
  }),
  assignments: many(assignmentsT),
}));

export const enrollmentsRelations = relations(enrollmentsT, ({ many, one }) => ({
  course: one(coursesT, {
    fields: [enrollmentsT.courseId],
    references: [coursesT.id],
  }),
  student: one(usersTable, {
    fields: [enrollmentsT.studentId],
    references: [usersTable.id],
  }),
  grades: many(gradesT),
}));

export const assignmentsRelations = relations(assignmentsT, ({ one, many }) => ({
  course: one(coursesT, {
    fields: [assignmentsT.courseId],
    references: [coursesT.id],
  }),
  grades: many(gradesT),
  studentsAssignments: many(studentsAssignmentsT),
}));

export const studentAssignmentsRelations = relations(studentsAssignmentsT, ({ one }) => ({
  assignment: one(assignmentsT, {
    fields: [studentsAssignmentsT.assignmentId],
    references: [assignmentsT.id],
  }),
  student: one(usersTable, {
    fields: [studentsAssignmentsT.studentId],
    references: [usersTable.id],
  }),
}));

export const gradesRelations = relations(gradesT, ({ one }) => ({
  enrollment: one(enrollmentsT, {
    fields: [gradesT.courseId, gradesT.studentId],
    references: [enrollmentsT.courseId, enrollmentsT.studentId],
  }),
  assignment: one(assignmentsT, {
    fields: [gradesT.assignmentId],
    references: [assignmentsT.id],
  }),
}));

// #endregion

export const usersRelations = relations(usersTable, ({ many }) => ({
  coursesTaught: many(coursesT),
  enrollments: many(enrollmentsT),
  specificAssignments: many(studentsAssignmentsT),
}));
