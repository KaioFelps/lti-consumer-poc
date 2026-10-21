import { type UUID } from "common/src/types/uuid";
import { Either } from "fp-ts/lib/Either";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiLineItem } from "$/assignment-and-grade/entities";
import { LtiLineItemsRepository as BaseLtiLineItemsRepository } from "$/assignment-and-grade/repositories";
import { Context } from "$/core/context";
import { ContextConcreteType } from "../enums/context-concrete-type";
import { LineItemNotFoundError } from "../errors/line-item-not-found.error";

type LineItemsOfAssignmentResponse = {
  lineItems: LtiLineItem[];
  manuallyChosenLineItemId: UUID | undefined;
};

export abstract class LtiLineItemsRepository extends BaseLtiLineItemsRepository {
  /**
   * Fetches every line item that has been created for the assignment (identified by
   * `assignmentId`).
   *
   * If some of them has been chosen to be the main line item — i.e., that represents
   * the actual grading of the assignment —, its ID will be set to `manuallyChosenLineItemId`
   * field.
   *
   * When there is more than one manually chosen line item — what shouldn't happen at all —,
   * the newest line item that has been chosen will be the one. (Note that it is *not* the
   * latest line item to be chosen, but the latest line item that _has been_ chosen.)
   *
   * @param assignmentId
   */
  public abstract getLineItemsOfAssignment(
    assignmentId: UUID,
    context: Context<ContextConcreteType>,
  ): Promise<Either<IrrecoverableError, LineItemsOfAssignmentResponse>>;

  /**
   * Marks the line item identified by `lineItemId` as the one chosen by the instructor to
   * represent the grades of the assignment identified by `assignmentId`.
   *
   * - It must run atomically (one transaction): `manually_chosen_by_instructor` must be
   *   set to `false` on every other line item of `assignmentId` and to `true` on `lineItemId`,
   *   so at most one line item stays chosen per assignment.
   * - It must return a {@link LineItemNotFoundError `LineItemNotFoundError`} when
   *   `lineItemId` does not exist **or does not belong to `assignmentId`** (i.e.,
   *   `lti_line_items.lti_assignment_id != assignmentId`). Nothing must be changed in this case.
   * - Choosing a line item that is already the chosen one is a no-op, not an error.
   *
   * @param assignmentId The assignment whose main line item is being chosen.
   * @param lineItemId The line item that will represent the assignment's grades.
   */
  public abstract chooseMainLineItemOfAssignment(
    assignmentId: UUID,
    lineItemId: UUID,
  ): Promise<Either<LineItemNotFoundError | IrrecoverableError, void>>;
}
