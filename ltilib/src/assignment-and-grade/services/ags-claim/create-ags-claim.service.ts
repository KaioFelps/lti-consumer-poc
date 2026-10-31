import { either as e, option as o, task as t, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
import { Option } from "fp-ts/lib/Option.js";
import agsPolicies from "$/assignment-and-grade/ags-policies.js";
import { AssignmentAndGradeServiceClaim } from "$/assignment-and-grade/claim.js";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository.js";
import { Context } from "$/core/context.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { Platform } from "$/core/platform.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { LtiTool } from "$/core/tool.js";

export type CreateClaimParams<CustomContextType = never> = {
  tool: LtiTool;
  context?: Context<CustomContextType>;
  resourceLink: LtiResourceLink;
};

export class CreateService<CustomContextType = never> {
  public constructor(
    private readonly platform: Platform,
    private readonly lineItemsRepo: LtiLineItemsRepository,
  ) {}

  public async execute({
    tool,
    context,
    resourceLink,
  }: CreateClaimParams<CustomContextType>): Promise<
    Either<LtiRepositoryError, Option<AssignmentAndGradeServiceClaim>>
  > {
    if (!this.platform.agsConfiguration) return e.right(o.none);
    if (!context) return e.right(o.none);

    const agsConfig = this.platform.agsConfiguration;
    const scopes = await this.resolveScopes(agsConfig, tool, context, resourceLink);
    const toolHasAccessToAgs = await agsPolicies.toolHasAccessToAgs(
      tool,
      this.platform,
      context,
      scopes,
    );

    if (!toolHasAccessToAgs) return e.right(o.none);

    return await pipe(
      this.tryGetLineItem(resourceLink, context),
      te.map(o.toUndefined),
      te.chainW((lineItem) => {
        return pipe(
          AssignmentAndGradeServiceClaim.create({
            context,
            agsConfig,
            scopes,
            specificLineItem: lineItem,
          }),
          e.map(o.some),
          te.fromEither,
        );
      }),
    )();
  }

  private async resolveScopes(
    agsConfig: Platform.LtiAssignmentAndGradeServicesConfig,
    tool: LtiTool,
    context: Context<CustomContextType>,
    resourceLink: LtiResourceLink,
  ) {
    return await pipe(
      () =>
        agsConfig.pickAllowedScopes({
          tool,
          context,
          deploymentId: resourceLink.deploymentId,
        }),
      t.map((scopes) => scopes.filter((scope) => tool.scopes.includes(scope))),
    )();
  }

  private tryGetLineItem(resourceLink: LtiResourceLink, context: Context<unknown>) {
    return pipe(
      () => this.lineItemsRepo.findManyByResourceLink(resourceLink.id, context, 2),
      te.map((lineItems) => (lineItems.length === 1 ? o.some(lineItems[0]) : o.none)),
      te.orElse((error) => (error.type === "NotFound" ? te.right(o.none) : te.left(error))),
    );
  }
}
