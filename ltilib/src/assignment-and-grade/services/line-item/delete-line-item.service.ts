/**
 * This service doesn't perform any fancy checks, but keeps everything
 * consistent with the other services.
 *
 * It has no unit test since there ain't much to assert, as the `delete`
 * method (of the repository) is up to the client-platform to implement.
 */

import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { LtiTool } from "$/core/tool";
import { LtiLineItemsRepository } from "../../repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "../../scopes";
import { LineItemService } from "./base-service";

export type DeleteLineItemServiceParams = {
  /**
   * The LTI tool which is trying to create this line item.
   */
  tool: LtiTool;
  /**
   * The ID of the line item to be deleted.
   */
  lineItemId: string;
};

const REQUIRED_SCOPES = [AssignmentAndGradeServiceScopes.Lineitem] as const;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiLineItemServices.create `LtiLineItemServices.delete`} instead.
 *
 * @internal
 */
export class DeleteService extends LineItemService {
  public constructor(private readonly lineItemsRepo: LtiLineItemsRepository) {
    super();
  }

  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return REQUIRED_SCOPES;
  }

  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }
  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }

  public async execute({ tool, lineItemId }: DeleteLineItemServiceParams) {
    return await pipe(
      () => this.lineItemsRepo.delete(lineItemId, tool),
      te.map(() => new HttpResponseWrapper<undefined, undefined>(undefined, 200, undefined, {})),
    )();
  }
}
