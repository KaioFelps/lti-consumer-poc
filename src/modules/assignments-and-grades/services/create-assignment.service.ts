import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { CourseWithInstructor } from "@/modules/courses-and-enrollments/aggregates/course-with-instructor.aggregate";
import { InstructorsRepository } from "@/modules/courses-and-enrollments/repositories/instructors.repository";
import policies from "../policies";
import { AssignmentsRepository } from "../repositories/assignments.repository";
import { CoursesRepository } from "../repositories/courses.repository";

type Params = {
  instructorId: UUID;
  courseId: UUID;
  title: string;
  maxScore: number;
  releasedAt?: Date;
  deadline?: Date;
};

@Injectable()
export class CreateAssignmentService {
  public constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly instructorsRepository: InstructorsRepository,
  ) {}

  public async execute({ courseId, instructorId, ...assignmentParams }: Params) {
    return await pipe(
      te.Do,
      te.apS("course", () => this.coursesRepository.findById(courseId)),
      te.apS("instructor", () => this.instructorsRepository.findInstructorById(instructorId)),
      te.chainFirstEitherKW(({ course, instructor }) =>
        policies.instructorIsAuthorized(instructor, course),
      ),
      te.map(({ course, instructor }) => CourseWithInstructor.create({ course, instructor })),
      te.chainEitherKW((course) => course.createAssignment(assignmentParams)),
      te.chainW((assignment) => () => this.assignmentsRepository.createAssignment(assignment)),
    )();
  }
}
