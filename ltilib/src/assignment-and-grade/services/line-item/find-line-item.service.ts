import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiAdvantageMediaType } from "$/advantage/media-types";
import { ensureAcceptHeaderIsValid } from "$/advantage/utils/ensure-accept-header-is-valid";
import { ensureHasAnyScope } from "$/advantage/utils/ensure-has-any-scope";
import { InaccessibleLineItemError } from "$/assignment-and-grade/errors/inaccessible-line-item.error";
import { LtiLineItem } from "$/assignment-and-grade/line-item";
import { presentLtiLineItem } from "$/assignment-and-grade/presenters/line-item.presenter";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { AssignmentAndGradeServiceScopes } from "$/assignment-and-grade/scopes";
import { Context } from "$/core/context";
import { HttpResponseWrapper } from "$/core/http/response-wrapper";
import { Platform } from "$/core/platform";
import { LtiToolDeploymentsRepository } from "$/core/repositories/tool-deployments.repository";
import { LtiTool } from "$/core/tool";

export type FindLineItemParams = {
  lineItemId: LtiLineItem["id"];
  acceptHeader: string | undefined;
  tool: LtiTool;
  context: Context;
};

export class FindService {
  public constructor(
    private readonly platform: Platform,
    private readonly lineItemsRepo: LtiLineItemsRepository,
    private readonly deploymentsRepo: LtiToolDeploymentsRepository,
  ) {}

  public async execute({ lineItemId, acceptHeader, tool, context }: FindLineItemParams) {
    const requiredMediaType = LtiAdvantageMediaType.LineItem;
    const requiredScopes = [
      AssignmentAndGradeServiceScopes.Lineitem,
      AssignmentAndGradeServiceScopes.LineitemReadonly,
    ];

    return await pipe(
      ensureAcceptHeaderIsValid({ acceptHeader, requiredMediaType }),
      e.chainW(() => ensureHasAnyScope({ tool, requiredScopes })),
      te.fromEither,
      te.chainW(() => this.ensureToolCanSearchThisLineitem(tool, context, lineItemId)),
      te.chainW(() => this.findLineItem(lineItemId)),
      te.chainW((lineItem) => this.ensureToolCanSeeLineItemDueToResource(lineItem, tool)),
      te.chainW((lineItem) => this.ensureToolCanSeeLineItemDueToResourceLink(lineItem, tool)),
      te.chainW((lineItem) => this.presentLineItem(lineItem, context)),
    )();
  }

  private presentLineItem(lineItem: LtiLineItem, context: Context) {
    const headers = { "Content-Type": LtiAdvantageMediaType.LineItem };

    return pipe(
      presentLtiLineItem(lineItem, context, this.platform),
      te.fromEither,
      te.map(
        (presented) => new HttpResponseWrapper<LtiLineItem>(presented, 200, lineItem, headers),
      ),
    );
  }

  private findLineItem(lineItemId: LtiLineItem["id"]) {
    return pipe(
      () => this.lineItemsRepo.findById(lineItemId),
      te.mapLeft((error) => {
        if (error.type !== "NotFound") return error;
        return new InaccessibleLineItemError(lineItemId, { cause: error });
      }),
    );
  }

  private ensureToolCanSeeLineItemDueToResourceLink(lineItem: LtiLineItem, tool: LtiTool) {
    if (!lineItem.resourceLink || lineItem.resourceLink.toolId === tool.id) {
      return te.right(lineItem);
    }

    return te.left(new InaccessibleLineItemError(lineItem.id));
  }

  private ensureToolCanSeeLineItemDueToResource(lineItem: LtiLineItem, tool: LtiTool) {
    if (!lineItem.externalResource || lineItem.externalResource.tool.id === tool.id) {
      return te.right(lineItem);
    }

    return te.left(new InaccessibleLineItemError(lineItem.id));
  }

  private ensureToolCanSearchThisLineitem(
    tool: LtiTool,
    context: Context,
    lineItemId: LtiLineItem["id"],
  ) {
    return pipe(
      () => this.deploymentsRepo.findDeploymentInContextOrGlobal(tool.id, context.id),
      te.map(() => {}),
      te.mapLeft((error) => {
        if (error.type === "NotFound") return new InaccessibleLineItemError(lineItemId);
        return error;
      }),
    );
  }
}
