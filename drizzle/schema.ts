import { sql } from "drizzle-orm";
import {
  check,
  pgEnum,
  pgTable,
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

export const usersTable = pgTable(
  "users",
  {
    // user fields
    id: uuid().primaryKey().notNull(),
    username: varchar({ length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 120 }).notNull(),
    profilePictureUrl: varchar("profile_picture_url", { length: 255 }),
    systemRole: systemRoleEnum("system_role")
      .default(SystemRole.User)
      .notNull(),
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
  },
  (_table) => [
    check("users_id_not_null", sql`NOT NULL id`),
    check("users_username_not_null", sql`NOT NULL username`),
    check("users_password_hash_not_null", sql`NOT NULL password_hash`),
    check("users_system_role_not_null", sql`NOT NULL system_role`),
  ],
);
