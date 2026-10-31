import { type UUID } from "common/src/types/uuid.js";
import { Either } from "fp-ts/lib/Either.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { InstructorNotFoundError } from "@/modules/assignments-and-grades/errors/instructor-not-found.error.js";
import { Instructor } from "../entities/instructor.entity.js";
import { NotAnInstructorError } from "../errors/not-an-instructor.js";

export abstract class InstructorsRepository {
  public abstract findInstructorById(
    id: UUID,
  ): Promise<
    Either<NotAnInstructorError | InstructorNotFoundError | IrrecoverableError, Instructor>
  >;
}
