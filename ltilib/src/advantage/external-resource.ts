import { Context } from "$/core/context";
import { ToolRecord } from "$/registration/tool-record";

export interface IExternalLtiResource {
  /**
   * The platform which the resource belongs to.
   */
  tool: ToolRecord;
  /**
   * The platform's context in which the resources are placed.
   */
  context?: Context;
  /**
   * The internal ID of the tool's resource attached to this platform's resource.
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
  public readonly tool: ToolRecord;
  public readonly context?: Context<never> | undefined;
  public readonly externalToolResourceId: string;
  public readonly localResourceId: string;
}
