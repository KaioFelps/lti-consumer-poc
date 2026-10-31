import { Inject, Injectable } from "@nestjs/common";
import { usersTable } from "drizzle/schema.js";
import { and, eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { tryCatch } from "fp-ts/lib/TaskEither.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error.js";
import { PeopleRepository } from "@/modules/identity/person/people.repository.js";
import { Person } from "@/modules/identity/person/person.entity.js";
import mappers from "@/modules/lti/mappers/index.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { LtiUserIdentitiesRespository } from "$/core/repositories/user-identities.repository.js";
import { UserIdentity } from "$/core/user-identity.js";
import { DrizzleClient } from "../client.js";
import peopleMapper from "../mappers/people.mapper.js";

@Injectable()
export class DrizzlePeopleRepository
  extends PeopleRepository
  implements LtiUserIdentitiesRespository<never>
{
  @Inject()
  private drizzle: DrizzleClient;

  public async createPerson(person: Person): Promise<Either<IrrecoverableError, Person>> {
    return pipe(
      tryCatch(
        () => {
          return this.drizzle.getClient().insert(usersTable).values(peopleMapper.intoRow(person));
        },
        (error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzlePeopleRepository.name} on ` +
              "persisting a person instance in the database.",
            error as Error,
          ),
      ),
      te.map(() => person),
    )();
  }

  public async findById(
    personId: string,
  ): Promise<Either<IrrecoverableError | PersonNotFoundError, Person>> {
    return await pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .select()
            .from(usersTable)
            // ensure only valid person are fetched from database
            .where(and(eq(usersTable.id, personId), peopleMapper.requiredQueryConfig.where))
            .limit(1)
            .execute(),
        (error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzlePeopleRepository.name} on finding person by its id.`,
            error as Error,
          ),
      ),
      te.map((rows) => rows.map(peopleMapper.fromRow)),
      te.map((people) => people[0] as Person | undefined),
      te.chainW(te.fromNullable(new PersonNotFoundError(personId))),
    )();
  }

  public async findUserIdentityById(
    userId: string,
  ): Promise<Either<LtiRepositoryError<unknown>, UserIdentity<never>>> {
    return pipe(
      () => this.findById(userId),
      te.map((person) => mappers.mapPersonToUserIdentity(person)),
      te.mapLeft((error) => {
        if (error instanceof IrrecoverableError) {
          return new LtiRepositoryError({ type: "ExternalError", cause: error });
        }

        return new LtiRepositoryError({
          type: "NotFound",
          subject: UserIdentity.name,
          cause: error,
        });
      }),
    )();
  }
}
