import { type UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { InstructorNotFoundError } from "@/modules/assignments-and-grades/errors/instructor-not-found.error";
import { Instructor } from "../entities/instructor.entity";
import { NotAnInstructorError } from "../errors/not-an-instructor";

export abstract class InstructorsRepository {
  public abstract findInstructorById(
    id: UUID,
  ): Promise<
    Either<NotAnInstructorError | InstructorNotFoundError | IrrecoverableError, Instructor>
  >;
}
