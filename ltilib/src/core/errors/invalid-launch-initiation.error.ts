import { LtilibError } from "./bases/ltilib.error";

type Reason = "resource_link_does_not_belong_to_tool" | "resource_link_is_not_in_tools_deployments";

const MESSAGES: Record<Reason, string> = {
  resource_link_does_not_belong_to_tool:
    "Configuration Mismatch: The activity link you are trying to access belongs " +
    "to a different tool. Please verify the tool settings in your course.",
  resource_link_is_not_in_tools_deployments:
    "The activity link you are trying to access belongs to a different deployment " +
    "of this tool. Please verify the tool settings in your course.",
};

export class InvalidLaunchInitiationError extends LtilibError {
  public constructor(
    public readonly reason: Reason,
    options?: ErrorOptions,
  ) {
    super(403, MESSAGES[reason], options);
  }
}
