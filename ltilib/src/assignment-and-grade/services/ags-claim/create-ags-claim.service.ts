import { either as e, option as o, task as t, taskEither as te } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { Option } from "fp-ts/lib/Option";
import agsPolicies from "$/assignment-and-grade/ags-policies";
import { AssignmentAndGradeServiceClaim } from "$/assignment-and-grade/claim";
import { MissingPlatformAgsConfiguration } from "$/assignment-and-grade/errors/missing-platform-ags-configuration.error";
import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { Context } from "$/core/context";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { Platform } from "$/core/platform";
import { LtiResourceLink } from "$/core/resource-link";
import { ToolRecord } from "$/registration/tool-record";

export type CreateClaimParams = {
  tool: ToolRecord;
  context?: Context;
  resourceLink: LtiResourceLink;
};

export class CreateService {
  public constructor(
    private readonly platform: Platform,
    private readonly lineItemsRepo: LtiLineItemsRepository,
  ) {}

  public async execute({
    tool,
    context,
    resourceLink,
  }: CreateClaimParams): Promise<
    Either<
      MissingPlatformAgsConfiguration | LtiRepositoryError,
      Option<AssignmentAndGradeServiceClaim>
    >
  > {
    if (!this.platform.agsConfiguration) return e.left(new MissingPlatformAgsConfiguration());

    const agsConfig = this.platform.agsConfiguration;

    if (!agsPolicies.toolHasAccessToAgs(tool, this.platform, context)) return e.right(o.none);
    if (!context) return e.right(o.none);

    return await pipe(
      te.Do,
      te.apS("lineItem", pipe(this.tryGetLineItem(resourceLink), te.map(o.toUndefined))),
      te.apS("scopes", te.fromTask(this.resolveScopes(agsConfig, tool, context, resourceLink))),
      te.chainW(({ lineItem, scopes }) =>
        pipe(
          AssignmentAndGradeServiceClaim.create({
            context,
            platform: this.platform,
            scopes,
            specificLineItem: lineItem,
          }),
          e.map(o.some),
          te.fromEither,
        ),
      ),
    )();
  }

  private resolveScopes(
    agsConfig: Platform.LtiAssignmentAndGradeServicesConfig,
    tool: ToolRecord,
    context: Context,
    resourceLink: LtiResourceLink,
  ) {
    const toolScopes = tool.scope.split(" ");

    return pipe(
      () =>
        agsConfig.pickAllowedScopes({
          tool,
          context,
          deploymentId: resourceLink.deploymentId,
        }),
      t.map((scopes) => scopes.filter((scope) => toolScopes.includes(scope))),
    );
  }

  private tryGetLineItem(resourceLink: LtiResourceLink) {
    return pipe(
      () => this.lineItemsRepo.findByResourceLink(resourceLink.id),
      te.map(o.some),
      te.orElse((error) => (error.type === "NotFound" ? te.right(o.none) : te.left(error))),
    );
  }
}
