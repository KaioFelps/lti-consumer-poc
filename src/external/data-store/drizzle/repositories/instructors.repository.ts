import { Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Instructor } from "@/modules/courses-and-enrollments/entities/instructor.entity";
import { InstructorsRepository } from "@/modules/courses-and-enrollments/repositories/instructors.repository";
import { PeopleRepository } from "@/modules/identity/person/people.repository";

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
