import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { InstructorsRepository } from "@/modules/courses-and-enrollments/repositories/instructors.repository";
import { PersonNotFoundError } from "@/modules/identity/errors/person-not-found.error";
import { PeopleRepository } from "@/modules/identity/person/people.repository";
import { StudentNotFoundError } from "../errors/student-not-found.error";
import policies from "../policies";
import { AssignmentsRepository } from "../repositories/assignments.repository";
import { CoursesRepository } from "../repositories/courses.repository";

type Params = {
  assignmentId: UUID;
  score: number;
  release: boolean;
  studentId: UUID;
  instructorId: UUID;
};

@Injectable()
export class GradeAnAssignmentService {
  public constructor(
    private readonly peopleRepository: PeopleRepository,
    private readonly instructorsRepository: InstructorsRepository,
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  public async execute({ studentId, assignmentId, instructorId, release, score }: Params) {
    return await pipe(
      te.Do,
      te.apS("instructor", () => this.instructorsRepository.findInstructorById(instructorId)),
      te.apS("student", this.findStudent(studentId)),
      te.apS("assignment", () => this.assignmentsRepository.findById(assignmentId)),
      te.bindW(
        "course",
        ({ assignment }) =>
          () =>
            this.coursesRepository.findById(assignment.getCourseId()),
      ),
      te.chainFirstEitherKW(({ instructor, course }) =>
        policies.instructorIsAuthorized(instructor, course),
      ),
      te.chainEitherKW(({ assignment, student }) => assignment.grade(student, score, release)),
      te.chainW((grade) => () => this.assignmentsRepository.saveGrade(grade)),
    )();
  }

  private findStudent(studentId: UUID) {
    return pipe(
      () => this.peopleRepository.findById(studentId.toString()),
      te.mapError((error) => {
        return error instanceof PersonNotFoundError ? new StudentNotFoundError(studentId) : error;
      }),
    );
  }
}
