import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid.js";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository.js";

type Params = {
  courseId: UUID;
};

@Injectable()
export class FindCourseByIdService {
  public constructor(private readonly coursesRepository: CoursesRepository) {}

  public exec({ courseId }: Params) {
    return this.coursesRepository.findCourseWithInstructorById(courseId);
  }
}
