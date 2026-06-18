import { Injectable } from "@nestjs/common";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { LtiContextsRepository } from "../../advantage/repositories/lti-contexts.repository";
import { ContextConcreteType } from "../enums/context-concrete-type";

type Params = {
  course: Course;
};

@Injectable()
export class CreateCourseContextService {
  public constructor(private readonly contextsRepo: LtiContextsRepository) {}

  public async exec({ course }: Params) {
    return await this.contextsRepo.create({
      concreteId: course.getId().toString(),
      concreteType: ContextConcreteType.Course,
    });
  }
}
