import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";

type Params = {
  courseId: UUID;
};

@Injectable()
export class FindCourseByIdService {
  public constructor(private readonly coursesRepository: CoursesRepository) {}

  public execute({ courseId }: Params) {
    return this.coursesRepository.findCourseWithInstructorById(courseId);
  }
}
