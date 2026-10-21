import { Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { systemRoleEnum, usersTable } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { StudentsRepository } from "@/modules/courses-and-enrollments/repositories/students.repository";
import { Person } from "@/modules/identity/person/person.entity";
import { DrizzleClient } from "../client";
import peopleMapper from "../mappers/people.mapper";
import { DrizzleTransactionManager } from "../transaction-manager";

@Injectable()
export class DrizzleStudentsRepository extends StudentsRepository {
  public constructor(
    private readonly client: DrizzleClient,
    private readonly transaction: DrizzleTransactionManager,
  ) {
    super();
  }

  public fetchStudentsFromCourse(
    // we're not using course yet since there enrollment domain ain't actually done
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Person[]>> {
    const client = this.transaction.getTx() ?? this.client.getClient();
    return pipe(
      te.tryCatch(
        () =>
          client.query.usersTable.findMany({
            ...peopleMapper.requiredQueryConfig,
            // furthermore it should perform some inArray query to pick only the ids of users that has an enrollment entity
            // attached to the `courseId`
            // but for now any non-admin user is a student and thus can see any course and do any existing assignment
            where: eq(usersTable.systemRole, systemRoleEnum.enumValues[1]),
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred in ${DrizzleStudentsRepository.name} when fetching students enrolled in course "${courseId}".`,
            error as Error,
          ),
      ),
      te.map((rows) => rows.map(peopleMapper.fromRow)),
    )();
  }
}
