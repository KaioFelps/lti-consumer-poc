import { Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid.js";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity.js";
import { InstructorsRepository } from "@/modules/courses-and-enrollments/repositories/instructors.repository.js";
import { PeopleRepository } from "@/modules/identity/person/people.repository.js";

@Injectable()
export class DrizzleInstructorsRepository extends InstructorsRepository {
  public constructor(private readonly peopleRepository: PeopleRepository) {
    super();
  }

  public findInstructorById(id: UUID) {
    return pipe(
      () => this.peopleRepository.findById(id.toString()),
      te.chainEitherKW((person) => Instructor.create({ person })),
    )();
  }
}
