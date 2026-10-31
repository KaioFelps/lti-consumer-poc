import { type UUID } from "common/src/types/uuid.js";
import { Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { Person } from "@/modules/identity/person/person.entity.js";

export abstract class StudentsRepository {
  public abstract fetchStudentsFromCourse(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Person[]>>;
}
