import { ClassProperties } from "common/src/types/class-properties";

type Args = ClassProperties<LtiResourceLink>;

/**
 * A `ResourceLink` instance describes a resource link placement, i.e.,
 * an execution of the tool somewhere in the platform (e.g., the platform
 * execution as one of the activities from some Math Class course).
 */
export class LtiResourceLink {
  /**
   * An unique and stable ID that identifies the resource link placement inside the platform
   */
  public readonly id: string;
  /**
   * The deployment ID to which this resource link is associated to.
   */
  public deploymentId: string;
  /**
   * If this resource link belongs to a specific context, this must be the context's ID.
   * Contexts are not required in order to use resource links.
   */
  public contextId?: string;
  /**
   * The URL to the resource this link points to.
   */
  public resource: URL;
  /**
   * The title from the resource this link points to (e.g., "Marília de Dirceu Quiz").
   */
  public title?: string;
  /**
   * A sentence describing the activity in more details
   * (e.g., "A quiz about the forth and fifth chapters of Marília de Dirceu book." or instructions
   * on how to complete the activity).
   */
  public description?: string;

  protected constructor(args: Args) {
    Object.assign(this, args);
  }

  public static create(args: Args) {
    return new LtiResourceLink(args);
  }
}
