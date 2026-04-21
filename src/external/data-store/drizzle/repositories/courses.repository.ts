import { Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { coursesT } from "drizzle/schema";
import { eq } from "drizzle-orm";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { CourseNotFoundError } from "@/modules/assignments-and-grades/errors/course-not-found.error";
import { CoursesRepository } from "@/modules/assignments-and-grades/repositories/courses.repository";
import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { DrizzleClient } from "../client";
import coursesMapper from "../mappers/courses.mapper";

@Injectable()
export class DrizzleCoursesRepository extends CoursesRepository {
  public constructor(private readonly drizzle: DrizzleClient) {
    super();
  }

  public async findById(courseId: UUID) {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .query.coursesT.findFirst({ where: eq(coursesT.id, courseId.toString()) }),
        (error) =>
          new IrrecoverableError(
            `Unexpected error occurred when trying to find course with id '${courseId.toString()}'.`,
            error as Error,
          ),
      ),
      te.chainEitherKW((rawCourse) => {
        if (!rawCourse) return e.left(new CourseNotFoundError(courseId));
        return e.right(coursesMapper.fromRow(rawCourse));
      }),
    )();
  }

  public save(course: Course) {
    const payload = coursesMapper.intoRow(course);
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .insert(coursesT)
            .values(payload)
            .onConflictDoUpdate({
              target: coursesT.id,
              set: { title: payload.title, instructorId: payload.instructorId },
            }),
        (error) =>
          new IrrecoverableError(
            `Error occurred when trying to save/update course with tuple '${JSON.stringify(payload)}`,
            error as Error,
          ),
      ),
      te.map(() => course),
    )();
  }
}
