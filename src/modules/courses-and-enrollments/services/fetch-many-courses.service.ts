import { Injectable } from "@nestjs/common";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";

@Injectable()
export class FetchManyCoursesService {
  public constructor(private readonly coursesRepository: CoursesRepository) {}

  public async execute() {
    return await this.coursesRepository.findManyCoursesWithInstructors();
  }
}
