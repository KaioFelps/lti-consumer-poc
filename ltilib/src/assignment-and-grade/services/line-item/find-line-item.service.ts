import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiAdvantageMediaType } from "$/advantage/media-types.js";
import { LtiLineItem } from "$/assignment-and-grade/entities/index.js";
import { InaccessibleLineItemError } from "$/assignment-and-grade/errors.js";
import { presentLtiLineItem } from "$/assignment-and-grade/presenters/line-item.presenter.js";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository.js";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes.js";
import { Context } from "$/core/context.js";
import { HttpResponseWrapper } from "$/core/http/response-wrapper.js";
import { Platform } from "$/core/platform.js";
import { LtiTool } from "$/core/tool.js";
import { AGServiceBase } from "../index.js";

export type FindLineItemParams = {
  lineItemId: LtiLineItem["id"];
  tool: LtiTool;
  context: Context<unknown>;
};

const REQUIRED_SCOPES = [
  AssignmentAndGradeServiceScopes.Lineitem,
  AssignmentAndGradeServiceScopes.LineitemReadonly,
] as const;

/**
 * Do not use this service. It lacks important checks. Use
 * {@link LtiLineItemServices.find `LtiLineItemServices.find`} instead.
 *
 * @internal
 */
export class FindService extends AGServiceBase {
  public constructor(
    private readonly platform: Platform,
    lineItemsRepo: LtiLineItemsRepository,
  ) {
    super(lineItemsRepo);
  }

  getRequiredScopes(): readonly AssignmentAndGradeServiceScopes[] | undefined {
    return REQUIRED_SCOPES;
  }

  getRequiredAcceptHeader(): Readonly<LtiAdvantageMediaType> | undefined {
    return LtiAdvantageMediaType.LineItem;
  }

  getRequiredContentType(): Readonly<LtiAdvantageMediaType> | undefined {
    return undefined;
  }

  public async execute({ lineItemId, tool, context }: FindLineItemParams) {
    return await pipe(
      this.findLineItem(lineItemId, context),
      te.chainW((lineItem) => this.ensureToolCanAccessLineItem(lineItem, tool)),
      te.chainW((lineItem) => this.presentLineItem(lineItem, context)),
    )();
  }

  private presentLineItem(lineItem: LtiLineItem, context: Context<unknown>) {
    const headers = { "Content-Type": LtiAdvantageMediaType.LineItem };

    return pipe(
      presentLtiLineItem(lineItem, context, this.platform),
      te.fromEither,
      te.map(
        (presented) => new HttpResponseWrapper<LtiLineItem>(presented, 200, lineItem, headers),
      ),
    );
  }

  private findLineItem(lineItemId: LtiLineItem["id"], context: Context<unknown>) {
    return pipe(
      () => this.lineItemsRepository.findById(lineItemId, context),
      te.mapLeft((error) => {
        if (error.type !== "NotFound") return error;
        return new InaccessibleLineItemError(lineItemId, { cause: error });
      }),
    );
  }

  private ensureToolCanAccessLineItem(lineItem: LtiLineItem, tool: LtiTool) {
    if (lineItem.isAccessibleToTool(tool)) return te.right(lineItem);
    return te.left(new InaccessibleLineItemError(lineItem.id));
  }
}
