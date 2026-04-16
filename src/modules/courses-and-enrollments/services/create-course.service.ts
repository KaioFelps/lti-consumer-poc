import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";
import { InstructorsRepository } from "../repositories/instructors.repository";

type Params = {
  instructorId: UUID;
  title: string;
};

@Injectable()
export class CreateCourseService {
  public constructor(
    private readonly instructorsRepository: InstructorsRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  public async execute({ instructorId, title }: Params) {
    return await pipe(
      () => this.instructorsRepository.findInstructorById(instructorId.toString()),
      te.map((instructor) => instructor.createCourse({ title })),
      te.chainFirstW((aggregate) => () => this.coursesRepository.save(aggregate.getCourse())),
    )();
  }
}
