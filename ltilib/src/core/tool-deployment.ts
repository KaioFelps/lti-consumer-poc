export interface ILtiToolDeployment {
  /**
   * The identifier of this deployment.
   */
  id: string;
  /**
   * The identifier of the context to which the deployment belongs (if some).
   */
  contextId?: string;
  /**
   * The identifier of the LTI tool to which the deployment belongs.
   */
  toolId: string;
}

/**
 * Represents a deployment of a LTI tool (`ToolRecord`) within some context.
 */
export class LtiToolDeployment implements ILtiToolDeployment {
  public readonly id: string;
  public readonly contextId?: string;
  public readonly toolId: string;

  protected constructor(args: ILtiToolDeployment) {
    this.id = args.id;
    this.toolId = args.toolId;
    this.contextId = args.contextId;
  }

  public static create(args: ILtiToolDeployment) {
    return new LtiToolDeployment(args);
  }
}
