import { Context } from "$/core/context";
import { LtiTool } from "$/core/tool";

export interface IExternalLtiResource {
  /**
   * The tool to which the resource belongs.
   */
  tool: LtiTool;
  /**
   * The platform's context in which the resources are placed.
   */
  context?: Context;
  /**
   * This external resource's ID within the tool to which it belongs.
   */
  externalToolResourceId: string;
  /**
   * The ID of the platform's resource to be represented by the external LTI tool's resource.
   */
  localResourceId: string;
}

/**
 * Represents the mapping between the platform's activity and the tool's resource which
 * will represent it.
 */
export class ExternalLtiResource implements IExternalLtiResource {
  public tool: LtiTool;
  public context?: Context<never> | undefined;
  public readonly externalToolResourceId: string;
  public readonly localResourceId: string;

  protected constructor(args: IExternalLtiResource) {
    this.tool = args.tool;
    this.context = args.context;
    this.localResourceId = args.localResourceId;
    this.externalToolResourceId = args.externalToolResourceId;
  }

  public static create(args: IExternalLtiResource) {
    return new ExternalLtiResource(args);
  }

  public belongsToTool(tool: LtiTool) {
    return this.tool.id === tool.id;
  }
}
