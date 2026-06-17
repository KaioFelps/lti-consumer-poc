import { faker } from "@faker-js/faker";
import { usersTable } from "drizzle/schema";
import { DrizzleClient } from "@/external/data-store/drizzle/client";
import peopleMapper from "@/external/data-store/drizzle/mappers/people.mapper";
import { Person } from "@/modules/identity/person/person.entity";
import { CPF } from "@/modules/identity/person/value-objects/cpf";
import { SystemRole } from "@/modules/identity/user/enums/system-role";

type CreatePersonParams = Parameters<typeof Person.create>[0];

/**
 * Creates a `System.Admin` person by default.
 */
function create(overrideProps: Partial<CreatePersonParams> = {}): Person {
  const defaultProps: CreatePersonParams = {
    firstName: faker.person.firstName(),
    surname: faker.person.lastName(),
    email: faker.internet.email(),
    birthDate: faker.date.birthdate(),
    cpf: CPF.createUnchecked(faker.helpers.replaceSymbols("###########")),

    username: faker.internet.username(),
    passwordHash: "$2b$10$EPjHzXptvQ4E677F6v3AdeU48P29EAHB.6WwM6EP3p.qPcvb5eQ/W",
    systemRole: SystemRole.Admin,
    profilePictureUrl: faker.image.avatar(),

    gender: undefined,
  };

  return Person.create({
    ...defaultProps,
    ...overrideProps,
  });
}

async function createAndPersist(
  drizzle: DrizzleClient,
  overrideProps: Partial<CreatePersonParams> = {},
) {
  const person = create(overrideProps);
  await drizzle.getClient().insert(usersTable).values(peopleMapper.intoRow(person));
  return person;
}

export default {
  create,
  createAndPersist,
};
