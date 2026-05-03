import { Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { assignmentsT, gradesT } from "drizzle/schema";
import { and, eq } from "drizzle-orm";
import { either as e, option as opt, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { GradeOfAssignment } from "@/modules/assignments-and-grades/aggregates/grade-of-assignment.aggregate";
import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";
import { AssignmentNotFoundError } from "@/modules/assignments-and-grades/errors/assignment-not-found.error";
import { GradeNotFoundError } from "@/modules/assignments-and-grades/errors/grade-not-found.error";
import { AssignmentsRepository } from "@/modules/assignments-and-grades/repositories/assignments.repository";
import { DrizzleClient } from "../client";
import assignmentsMapper from "../mappers/assignments.mapper";
import gradesMapper from "../mappers/grades.mapper";

@Injectable()
export class DrizzleAssignmentsRepository extends AssignmentsRepository {
  public constructor(private readonly drizzle: DrizzleClient) {
    super();
  }

  public findById(assignmentId: UUID) {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .query.assignmentsT.findFirst({ where: eq(assignmentsT.id, assignmentId.toString()) }),
        (error) =>
          new IrrecoverableError(
            `Error occurred when trying to find assignment with id '${assignmentId.toString()}'.`,
            error as Error,
          ),
      ),
      te.chainEitherKW((rawAssignment) =>
        pipe(
          opt.fromNullable(rawAssignment),
          opt.map(assignmentsMapper.fromRow),
          e.fromOption(() => new AssignmentNotFoundError(assignmentId)),
          (a) => a,
        ),
      ),
    )();
  }

  public updateAssignment(assignment: Assignment): Promise<Either<IrrecoverableError, Assignment>> {
    const payload = assignmentsMapper.intoRow(assignment);

    return pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .update(assignmentsT)
            .set(payload)
            .where(eq(assignmentsT.id, assignment.getId().toString())),
        (error) =>
          new IrrecoverableError(
            `Error occurred when trying to update assignment with id '${assignment.getId().toString()}' ` +
              `with values '${JSON.stringify(payload)}'.`,
            error as Error,
          ),
      ),
      te.map((_queryResult) => assignment),
    )();
  }

  public saveGrade(gradeOfAssignment: GradeOfAssignment) {
    const gradePayload = gradesMapper.intoRow(gradeOfAssignment.getGrade());

    return pipe(
      te.tryCatch(
        () => this.drizzle.getClient().insert(gradesT).values(gradePayload),
        (error) =>
          new IrrecoverableError(
            `Error occurred when trying to insert grade '${JSON.stringify(gradePayload)}'.`,
            error as Error,
          ),
      ),
      te.map(() => gradeOfAssignment),
    )();
  }

  public findGradeOfAssignment(assignmentId: UUID, studentId: UUID) {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle.getClient().query.gradesT.findFirst({
            where: and(
              eq(gradesT.assignmentId, assignmentId.toString()),
              eq(gradesT.studentId, studentId.toString()),
            ),
            with: { assignment: true },
          }),
        (error) =>
          new IrrecoverableError(
            `Error occurred when searching for grade from assignment with id '${assignmentId.toString()}' and user with id '${studentId.toString()}'.`,
            error as Error,
          ),
      ),
      te.chainEitherKW((row) => {
        if (!row) return e.left(new GradeNotFoundError(assignmentId, studentId));
        if (!row.assignment) return e.left(new AssignmentNotFoundError(assignmentId));

        const assignment = assignmentsMapper.fromRow(row.assignment);
        const grade = gradesMapper.fromRow(row);
        return e.right(GradeOfAssignment.create({ assignment, grade }));
      }),
    )();
  }

  public createAssignment(assignment: Assignment) {
    const payload = assignmentsMapper.intoRow(assignment);
    return pipe(
      te.tryCatch(
        () => this.drizzle.getClient().insert(assignmentsT).values(payload),
        (error) =>
          new IrrecoverableError(
            `Error occurred when trying to persist assignment '${JSON.stringify(payload)}'.`,
            error as Error,
          ),
      ),
      te.map((_queryResult) => assignment),
    )();
  }

  public findManyAssignmentsByCourseId(
    courseId: UUID,
  ): Promise<Either<IrrecoverableError, Assignment[]>> {
    return pipe(
      te.tryCatch(
        () =>
          this.drizzle
            .getClient()
            .query.assignmentsT.findMany({ where: eq(assignmentsT.courseId, courseId.toString()) }),
        (error) =>
          new IrrecoverableError(
            `Error occurred when trying to find assignments with course id '${courseId.toString()}'.`,
            error as Error,
          ),
      ),
      te.map((rawAssignments) => rawAssignments.map(assignmentsMapper.fromRow)),
    )();
  }
}
