import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { CourseNotFoundError } from "@/modules/assignments-and-grades/errors/course-not-found.error";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type";
import { ContextNotFoundError } from "../../errors/context-not-found.error";
import { CourseContextAdapter } from "../adapters/course-context.adapter";
import { ContextFetcher } from ".";

@Injectable()
export class CourseContextFetcher extends ContextFetcher {
  public constructor(private readonly coursesRepository: CoursesRepository) {
    super(ContextConcreteType.Course);
  }

  public findById(id: string) {
    return pipe(
      () => this.coursesRepository.findById(id),
      te.map((course) => new CourseContextAdapter(course).getContext()),
      te.mapLeft((error) =>
        error instanceof CourseNotFoundError ? new ContextNotFoundError(id, this.type) : error,
      ),
    )();
  }
}
