import { UUID } from "common/src/types/uuid";
import { Context } from "../context";

interface ILtiAssignmentAndGradeServicesConfig {
  /**
   * A resolver to the line items endpoint complete URL.
   */
  lineItemsEndpoint: (context: Context, lineItemId: string | UUID | number) => URL;
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
}

/**
 * The configuration for enabling LTI Assignment and Grade services.
 * Must be enabled in the `Platform` configurations in order to
 * use ltilib implementations of the LTI AGS specification.
 */
export class LtiAssignmentAndGradeServicesConfig implements ILtiAssignmentAndGradeServicesConfig {
  public readonly lineItemsEndpoint: ILtiAssignmentAndGradeServicesConfig["lineItemsEndpoint"];

  public readonly deadlinesEnabled: Exclude<
    ILtiAssignmentAndGradeServicesConfig["deadlinesEnabled"],
    undefined
  >;

  private constructor(args: ILtiAssignmentAndGradeServicesConfig) {
    Object.assign(this, args);
    this.deadlinesEnabled ??= { end: false, start: false };
  }

  public static create(args: ILtiAssignmentAndGradeServicesConfig) {
    return new LtiAssignmentAndGradeServicesConfig(args);
  }
}
