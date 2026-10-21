import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { StudentsRepository } from "@/modules/courses-and-enrollments/repositories/students.repository";
import { Person } from "@/modules/identity/person/person.entity";
import { LtiLineItem } from "$/assignment-and-grade/entities";
import { Context } from "$/core/context";
import { CourseContextFetcher } from "../../advantage/context/fetchers/course-context-fetcher";
import { ContextConcreteType } from "../enums/context-concrete-type";
import { LtiLineItemsRepository } from "../repositories/lti-line-items.repository";
import { LineItemStudentScore, LtiScoresRepository } from "../repositories/lti-scores.repository";

type Params = {
  assignmentId: UUID;
  courseId: UUID;
  /**
   * Optional: when the caller already has the course's LTI context at hand, it avoids
   * one extra query.
   */
  courseContext?: Context<ContextConcreteType>;
};

type LineItemId = UUID;
type StudentId = UUID;

export type AssignmentGradingDetails = {
  /** Every line item created for the assignment. Empty when no tool has graded it yet. */
  lineItems: LtiLineItem[];
  /**
   * The line item that represents the assignment's grades:
   * - the one chosen by the instructor, when there is one; or
   * - the only line item, when the assignment has exactly one; or
   * - `undefined` when there are several and none has been chosen yet.
   */
  mainLineItem: LtiLineItem | undefined;
  /** Whether the instructor must still pick one line item (more than one and none chosen). */
  needsSelection: boolean;
  /** Every student enrolled in the course (the matrix's rows). */
  courseStudents: Person[];
  /**
   * Scores indexed by line item and then by student. A missing entry means the student
   * has no score on that line item (an empty cell).
   */
  scoresPerLineItem: Map<LineItemId, Map<StudentId, LineItemStudentScore>>;
};

@Injectable()
export class FindAssignmentGradingDetailsService {
  public constructor(
    private readonly scoresRepo: LtiScoresRepository,
    private readonly lineItemsRepo: LtiLineItemsRepository,
    private readonly contextResolver: CourseContextFetcher,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  public async exec({ assignmentId, courseId, courseContext }: Params) {
    return await pipe(
      te.Do,
      te.bindW("lineItemsOfAssignment", () =>
        this.getLineItems(courseId, assignmentId, courseContext),
      ),
      te.bindW(
        "courseStudents",
        () => () => this.studentsRepository.fetchStudentsFromCourse(courseId),
      ),
      te.bindW(
        "scores",
        ({ lineItemsOfAssignment, courseStudents }) =>
          () =>
            this.scoresRepo.findScoresOfStudentsOnLineItems(
              lineItemsOfAssignment.lineItems.map((lineItem) => lineItem.id as UUID),
              courseStudents.map((student) => student.getUser().getId()),
            ),
      ),
      te.map(({ lineItemsOfAssignment, courseStudents, scores }): AssignmentGradingDetails => {
        const { lineItems, manuallyChosenLineItemId } = lineItemsOfAssignment;

        const scoresPerLineItem = new Map<LineItemId, Map<StudentId, LineItemStudentScore>>(
          lineItems.map((lineItem) => [lineItem.id as UUID, new Map()]),
        );
        for (const score of scores) {
          scoresPerLineItem.get(score.lineItemId)?.set(score.studentId, score);
        }

        const mainLineItem =
          lineItems.find((lineItem) => lineItem.id === manuallyChosenLineItemId) ??
          (lineItems.length === 1 ? lineItems[0] : undefined);

        return {
          lineItems,
          mainLineItem,
          needsSelection: lineItems.length > 1 && mainLineItem === undefined,
          courseStudents,
          scoresPerLineItem,
        };
      }),
    )();
  }

  private getLineItems(
    courseId: UUID,
    assignmentId: UUID,
    context: Context<ContextConcreteType> | undefined,
  ) {
    return pipe(
      context
        ? te.right<unknown, Context<ContextConcreteType>>(context)
        : () => this.contextResolver.findById(courseId.toString()),
      te.chainW(
        (resolvedContext) => () =>
          this.lineItemsRepo.getLineItemsOfAssignment(assignmentId, resolvedContext),
      ),
    );
  }
}
