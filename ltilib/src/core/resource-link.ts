import { generateUUID } from "common/src/types/uuid";
import { IntoLtiClaim } from "$/claims/serialization";

export interface ILtiResourceLink {
  /**
   * An unique and stable ID that identifies the resource link placement inside the platform
   */
  readonly id?: string | undefined;
  /**
   * The deployment ID to which this resource link is associated to.
   */
  deploymentId: string;
  /**
   * If this resource link belongs to a specific context, this must be the context's ID.
   * Contexts are not required in order to use resource links.
   */
  contextId?: string;
  /**
   * The URL to the resource this link points to.
   */
  resource: URL;
  /**
   * The title from the resource this link points to (e.g., "Marília de Dirceu Quiz").
   */
  title?: string;
  /**
   * A sentence describing the activity in more details
   * (e.g., "A quiz about the forth and fifth chapters of Marília de Dirceu book." or instructions
   * on how to complete the activity).
   */
  description?: string;
  /**
   * The identifier of the LTI Tool this resource link belongs to.
   */
  toolId: string;
  /**
   * A record of custom parameters related to this resource link instance.
   *
   * @see {@link https://www.imsglobal.org/spec/lti-dr/v1p0#lti-configuration-0}
   */
  customParameters?: Record<string, string> | undefined;
}

/**
 * A `ResourceLink` instance describes a resource link placement, i.e.,
 * an execution of the tool somewhere in the platform (e.g., the platform
 * execution as one of the activities from some Math Class course).
 */
export class LtiResourceLink implements ILtiResourceLink, IntoLtiClaim {
  public readonly id: string;
  public deploymentId: string;
  public contextId?: string;
  public resource: URL;
  public title?: string;
  public description?: string;
  public toolId: string;
  public customParameters: Record<string, string> = {};

  protected constructor(args: ILtiResourceLink) {
    Object.assign(this, { ...args, id: args.id ?? generateUUID() });
  }

  public static create(args: ILtiResourceLink) {
    return new LtiResourceLink(args);
  }

  intoLtiClaim(): object {
    return {
      id: this.id,
      description: this.description,
      title: this.title,
    };
  }
}
