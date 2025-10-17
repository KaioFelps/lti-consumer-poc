import { Inject, Injectable } from "@nestjs/common";
import { usersTable } from "drizzle/schema";
import { taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { PeopleRepository } from "@/identity/person/people.repository";
import { Person } from "@/identity/person/person.entity";
import { DrizzleClient } from "../client";

@Injectable()
export class DrizzlePeopleRepository extends PeopleRepository {
  @Inject()
  private drizzle: DrizzleClient;

  public async createPerson(
    person: Person,
  ): Promise<Either<IrrecoverableError, Person>> {
    return pipe(
      tryCatch(
        () => {
          return this.drizzle.getClient().insert(usersTable).values({
            id: person.getUser().getId().toString(),
            passwordHash: person.getUser().getPasswordHash(),
            username: person.getUser().getUsername(),
            birthDate: person.getBirthDate(),
            cpf: person.getCpf().toRawString(),
            email: person.getEmail(),
            firstName: person.getFirstName(),
            gender: person.getGender(),
            profilePictureUrl: person.getUser().getProfilePictureUrl(),
            surname: person.getSurname(),
            systemRole: person.getUser().getSystemRole(),
          });
        },
        (error: Error) =>
          new IrrecoverableError(
            "An error occurred in DrizzlePeopleRepository on " +
              "persisting a person instance in the database.",
            error,
          ),
      ),
      taskEither.map(() => person),
    )();
  }
}
