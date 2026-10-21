import { type UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { Person } from "@/modules/identity/person/person.entity";

export abstract class StudentsRepository {
  public abstract fetchStudentsFromCourse(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Person[]>>;
}
