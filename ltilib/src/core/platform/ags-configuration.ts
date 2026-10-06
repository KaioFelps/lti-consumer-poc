import { UUID } from "common/src/types/uuid";
import {
  ASSIGNMENT_AND_GRADE_SERVICES_SCOPES,
  AssignmentAndGradeServiceScopes,
} from "$/assignment-and-grade/scopes";
import { Context } from "../context";
import { LtiTool } from "../tool";
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
   * A resolver to a results container, i.e., a collection of results grouped by a line item
   * and the context to which the line item belongs.
   */
  resultsContainerEndpoint: (context: Context<unknown>, lineItemId: string | UUID | number) => URL;
  /**
   * A resolver to the result of a specific user within a specific line item.
   * It must be a fully qualified URL, but this URL doesn't need to be an existing endpoint
   * at all.
   */
  prepareResultId: (
    context: Context<unknown>,
    lineItemId: string | UUID | number,
    userId: string,
  ) => URL;
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
   * E.g., the platform may decide to allow or deny access to Assignment and Grade Services
   * based on the `tool` and/or `context` of the current launch.
   *
   * [AGS Claim]: https://www.imsglobal.org/spec/lti-ags/v2p0#assignment-and-grade-service-claim
   *
   * @default
   * ```ts
   * async ({ toolAgsScopes }) => {
   *    // true if the tool has at least one Assignment and Grade Service scope registered.
   *    return toolAgsScopes.length > 0;
   * };
   * ```
   */
  authorizeServicesClaim?: (ctx: {
    context: Context<unknown>;
    tool: LtiTool;
    toolAgsScopes: AssignmentAndGradeServiceScopes[];
  }) => Promise<boolean>;
  /**
   * Filters which of the AGS scopes the tool already has will be allowed during the current launch.
   * A platform may use this, e.g., for authorizing scopes per deployment.
   *
   * Note that issued scopes which the tool has not access per registration will be discarted.
   *
   * @default
   * ```ts
   * async ({ tool }) => {
   *    // returns every AGS scope the tool has within its registered scopes.
   *    return tool.scope
   *        .split(" ")
   *        .filter((scope) => ASSIGNMENT_AND_GRADE_SERVICES_SCOPES.includes(scope))
   * }
   * ```
   */
  pickAllowedScopes?: (ctx: {
    tool: LtiTool;
    context: Context<unknown>;
    deploymentId: LtiToolDeployment["id"];
  }) => Promise<AssignmentAndGradeServiceScopes[]>;
  /**
   * Whether timestamp fields should have strict validation per LTI AGS specs.
   * When `false`, it performs a relaxed validation and allows datetime strings
   * that don't have sub-second precision.
   *
   * @default true
   */
  strictTimestampValidation?: boolean;
}

/**
 * The configuration for enabling LTI Assignment and Grade services.
 * Must be enabled in the `Platform` configurations in order to
 * use ltilib implementations of the LTI AGS specification.
 */
export class LtiAssignmentAndGradeServicesConfig implements ILtiAssignmentAndGradeServicesConfig {
  public readonly lineItemsContainerEndpoint!: ILtiAssignmentAndGradeServicesConfig["lineItemsContainerEndpoint"];

  public readonly resultsContainerEndpoint!: ILtiAssignmentAndGradeServicesConfig["resultsContainerEndpoint"];

  public readonly lineItemEndpoint!: ILtiAssignmentAndGradeServicesConfig["lineItemEndpoint"];

  public readonly prepareResultId!: ILtiAssignmentAndGradeServicesConfig["prepareResultId"];

  public readonly deadlinesEnabled: Exclude<
    ILtiAssignmentAndGradeServicesConfig["deadlinesEnabled"],
    undefined
  >;

  public readonly authorizeServicesClaim: Exclude<
    ILtiAssignmentAndGradeServicesConfig["authorizeServicesClaim"],
    undefined
  > = async ({ toolAgsScopes }) => toolAgsScopes.length > 0;

  public readonly pickAllowedScopes: Exclude<
    ILtiAssignmentAndGradeServicesConfig["pickAllowedScopes"],
    undefined
  > = async ({ tool }) => {
    return tool.scopes.filter((scope) =>
      ASSIGNMENT_AND_GRADE_SERVICES_SCOPES.includes(scope as AssignmentAndGradeServiceScopes),
    ) as AssignmentAndGradeServiceScopes[];
  };

  public readonly strictTimestampValidation: boolean = true;

  private constructor(args: ILtiAssignmentAndGradeServicesConfig) {
    Object.assign(this, args);
    this.deadlinesEnabled ??= { end: false, start: false };
  }

  public static create(args: ILtiAssignmentAndGradeServicesConfig) {
    return new LtiAssignmentAndGradeServicesConfig(args);
  }
}
