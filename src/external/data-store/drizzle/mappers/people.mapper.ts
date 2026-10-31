import type * as schema from "drizzle/schema.js";
import { usersTable } from "drizzle/schema.js";
import {
  type BuildQueryResult,
  type DBQueryConfig,
  type ExtractTablesWithRelations,
  sql,
} from "drizzle-orm";
import { pipe } from "fp-ts/lib/function.js";
import { Person, PersonUncheckedProps } from "@/modules/identity/person/person.entity.js";
import { trimNullProperties } from "@/utils/trim-null-properties.js";

type Schema = ExtractTablesWithRelations<typeof schema>;

type PeopleQueryConfig = DBQueryConfig<"many", boolean, Schema, Schema["usersTable"]>;

type PersonRow = BuildQueryResult<Schema, Schema["usersTable"], typeof requiredQueryConfig>;

const requiredQueryConfig = {
  where: sql`${[
    usersTable.firstName,
    usersTable.surname,
    usersTable.cpf,
    usersTable.birthDate,
  ]} IS NOT NULL`,
} as const satisfies PeopleQueryConfig;

function intoRow(person: Person): PersonRow {
  return {
    id: person.getUser().getId().toString(),
    passwordHash: person.getUser().getPasswordHash(),
    username: person.getUser().getUsername(),
    birthDate: person.getBirthDate(),
    cpf: person.getCpf().toRawString(),
    email: person.getEmail(),
    firstName: person.getFirstName(),
    gender: person.getGender() ?? null,
    profilePictureUrl: person.getUser().getProfilePictureUrl(),
    surname: person.getSurname(),
    systemRole: person.getUser().getSystemRole(),
  };
}

function fromRow(row: PersonRow): Person {
  return pipe(
    row,
    trimNullProperties,
    (person) => person as PersonUncheckedProps,
    Person.createUnchecked,
  );
}

export default {
  intoRow,
  fromRow,
  requiredQueryConfig,
};
