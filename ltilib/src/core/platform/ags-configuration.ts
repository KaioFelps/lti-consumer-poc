import { UUID } from "common/src/types/uuid";
import {
  ASSIGNMENT_AND_GRADE_SERVICES_SCOPES,
  AssignmentAndGradeServiceScopes,
} from "$/assignment-and-grade/scopes";
import { ToolRecord } from "$/registration/tool-record";
import { Context } from "../context";
import { LtiToolDeployment } from "../tool-deployment";

interface ILtiAssignmentAndGradeServicesConfig {
  /**
   * A resolver to a specific line item endpoint's complete URL.
   */
  lineItemEndpoint: (context: Context<unknown>, lineItemId: string | UUID | number) => URL;
  /**
   * A resolver to a `context`'s line items container.
   */
  lineItemsContainerEndpoint: (context: Context<unknown>) => URL;
  /**
   * Defines the platform's capability to handle submission deadlines.
   * According to LTI AGS spec:
   * - If a property is `false` or undefined, the corresponding field MUST be
   * omitted in outgoing responses (GET) and silently ignored in incoming requests (POST/PUT).
   * - This acts as a feature flag for `startDateTime` and `endDateTime`.
   *
   * @default {start: false, end: false}
   */
  deadlinesEnabled?: {
    start: boolean;
    end: boolean;
  };
  /**
   * Whether the [AGS Claim] should be included in the current launch message.
   *
   * [AGS Claim]: https://www.imsglobal.org/spec/lti-ags/v2p0#assignment-and-grade-service-claim
   *
   * @default
   * Returns true if the tool has at least one Assignment and Grade Service scope registered.
   *
   * @example
   * ```ts
   * async ({ tool }) => {
   *    const requiredScopes = ASSIGNMENT_AND_GRADE_SERVICES_SCOPES;
   *    return tool.scope.split(" ").some((scope) => requiredScopes.includes(scope));
   * };
   * ```
   */
  authorizeServicesClaim?: (ctx: {
    context: Context<unknown>;
    tool: ToolRecord;
  }) => Promise<boolean>;
  /**
   * Filters which of the AGS scopes the tool already has will be allowed during the current launch.
   * A platform may use this, e.g., for authorizing scopes per deployment.
   *
   * Note that issued scopes which the tool has not access per registration will be discarted.
   *
   * @default
   * Returns every AGS scope the tool has within its registered scopes.
   *
   * @example
   * ```ts
   * async ({ tool }) => {
   *    return tool.scope
   *        .split(" ")
   *        .filter((scope) => ASSIGNMENT_AND_GRADE_SERVICES_SCOPES.includes(scope))
   * }
   * ```
   */
  pickAllowedScopes?: (ctx: {
    tool: ToolRecord;
    context: Context<unknown>;
    deploymentId: LtiToolDeployment["id"];
  }) => Promise<AssignmentAndGradeServiceScopes[]>;
}

/**
 * The configuration for enabling LTI Assignment and Grade services.
 * Must be enabled in the `Platform` configurations in order to
 * use ltilib implementations of the LTI AGS specification.
 */
export class LtiAssignmentAndGradeServicesConfig implements ILtiAssignmentAndGradeServicesConfig {
  public readonly lineItemsContainerEndpoint: ILtiAssignmentAndGradeServicesConfig["lineItemsContainerEndpoint"];
  public readonly lineItemEndpoint: ILtiAssignmentAndGradeServicesConfig["lineItemEndpoint"];
  public readonly deadlinesEnabled: Exclude<
    ILtiAssignmentAndGradeServicesConfig["deadlinesEnabled"],
    undefined
  >;
  public readonly authorizeServicesClaim: Exclude<
    ILtiAssignmentAndGradeServicesConfig["authorizeServicesClaim"],
    undefined
  > = async ({ tool }) => {
    const requiredScopes = ASSIGNMENT_AND_GRADE_SERVICES_SCOPES as readonly string[];
    return tool.scope.split(" ").some((scope) => requiredScopes.includes(scope));
  };

  public readonly pickAllowedScopes: Exclude<
    ILtiAssignmentAndGradeServicesConfig["pickAllowedScopes"],
    undefined
  > = async ({ tool }) => {
    return tool.scope
      .split(" ")
      .filter((scope) =>
        ASSIGNMENT_AND_GRADE_SERVICES_SCOPES.includes(scope as AssignmentAndGradeServiceScopes),
      ) as AssignmentAndGradeServiceScopes[];
  };

  private constructor(args: ILtiAssignmentAndGradeServicesConfig) {
    Object.assign(this, args);
    this.deadlinesEnabled ??= { end: false, start: false };
  }

  public static create(args: ILtiAssignmentAndGradeServicesConfig) {
    return new LtiAssignmentAndGradeServicesConfig(args);
  }
}
