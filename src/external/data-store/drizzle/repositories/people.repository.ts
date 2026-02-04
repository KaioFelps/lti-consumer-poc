import { Inject, Injectable } from "@nestjs/common";
import { usersTable } from "drizzle/schema";
import { and, eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { tryCatch } from "fp-ts/lib/TaskEither";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error";
import { PeopleRepository } from "@/modules/identity/person/people.repository";
import { Person } from "@/modules/identity/person/person.entity";
import { DrizzleClient } from "../client";
import peopleMapper from "../mappers/people.mapper";

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
          return this.drizzle
            .getClient()
            .insert(usersTable)
            .values(peopleMapper.intoRow(person));
        },
        (error: Error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzlePeopleRepository.name} on ` +
              "persisting a person instance in the database.",
            error,
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
            .where(
              and(
                eq(usersTable.id, personId),
                peopleMapper.requiredQueryConfig.where,
              ),
            )
            .limit(1)
            .execute(),
        (error: Error) =>
          new IrrecoverableError(
            `An error occurred in ${DrizzlePeopleRepository.name} on finding person by its id.`,
            error,
          ),
      ),
      te.map((rows) => rows.map(peopleMapper.fromRow)),
      te.map((people) => people[0] as Person | undefined),
      te.chainW(te.fromNullable(new PersonNotFoundError(personId))),
    )();
  }
}
