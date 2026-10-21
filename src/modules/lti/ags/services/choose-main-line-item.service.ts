import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { LtiLineItemsRepository } from "../repositories/lti-line-items.repository";

type Params = {
  assignmentId: UUID;
  lineItemId: UUID;
};

/**
 * Lets the instructor choose which line item represents the grades of an LTI assignment.
 *
 * @note Authorization (only the course's instructor may do this) is checked by the controller
 * before calling this service; ownership of the line item (it must belong to the assignment)
 * is enforced by the repository, which answers with a `NotFound` error otherwise.
 */
@Injectable()
export class ChooseMainLineItemService {
  public constructor(private readonly lineItemsRepo: LtiLineItemsRepository) {}

  public async exec({ assignmentId, lineItemId }: Params) {
    return await this.lineItemsRepo.chooseMainLineItemOfAssignment(assignmentId, lineItemId);
  }
}
