import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { CourseNotFoundError } from "@/modules/assignments-and-grades/errors/course-not-found.error.js";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository.js";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type.js";
import { ContextNotFoundError } from "../../errors/context-not-found.error.js";
import { CourseContextAdapter } from "../adapters/course-context.adapter.js";
import { ContextFetcher } from "./index.js";

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
