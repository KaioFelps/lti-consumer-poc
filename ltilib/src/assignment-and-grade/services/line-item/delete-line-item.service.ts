/**
 * This service doesn't perform any fancy checks, but keeps everything
 * consistent with the other services.
 *
 * It has no unit test since there ain't much to assert, as the `delete`
 * method (of the repository) is up to the client-platform to implement.
 */

import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiAdvantageMediaType } from "$/advantage/media-types.js";
import { HttpResponseWrapper } from "$/core/http/response-wrapper.js";
import { LtiTool } from "$/core/tool.js";
import { AssignmentAndGradeServiceScopes } from "../../scopes.js";
import { AGServiceBase } from "../index.js";

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
export class DeleteService extends AGServiceBase {
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
      () => this.lineItemsRepository.delete(lineItemId, tool),
      te.map(() => new HttpResponseWrapper<undefined, undefined>(undefined, 200, undefined, {})),
    )();
  }
}
