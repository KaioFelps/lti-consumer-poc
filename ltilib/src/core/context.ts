import { ClassProperties } from "common/src/types/class-properties";
import { Optional } from "common/src/types/optional";
import { generateUUID } from "common/src/types/uuid";
import { IntoLtiClaim } from "$/claims/serialization";

export enum ContextType {
  CourseTemplate = "http://purl.imsglobal.org/vocab/lis/v2/course#CourseTemplate",
  CourseOffering = "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering",
  CourseSection = "http://purl.imsglobal.org/vocab/lis/v2/course#CourseSection",
  Group = "http://purl.imsglobal.org/vocab/lis/v2/course#Group",
}

type Args = ClassProperties<Context>;

/**
 * A LTI context represents a group of related LTI items. I.e., when a collection of resources
 * are related to a specific course, this course is a context.
 */
export class Context<CustomContextType = never> implements IntoLtiClaim {
  /**
   * An unique and stable ID that identifies the context:
   * - globally in the platform;
   * - locally in the tool (i.e., there can be only one pair of [deployment_id, context.id] in the
   * platform side).
   */
  public readonly id: string;
  /**
   * A list containing the applicable context types for this launch.
   * A plataform may (but should not) use custom context types — they must also
   * be fully resolved URIs.
   */
  public type?: [ContextType, ...(CustomContextType | ContextType)[]];
  /**
   * A short and meaningful name for the context.
   */
  public label?: string;
  /**
   * The descriptive full name of this context.
   */
  public title?: string;

  protected constructor(args: Args) {
    Object.assign(this, args);
  }

  // This allows us to return an `Either<Error, Context>` in the future with ease.
  public static create(args: Optional<Args, "id">) {
    return new Context({ ...args, id: args.id ?? generateUUID() });
  }

  intoLtiClaim() {
    return {
      id: this.id,
      type: this.type,
      label: this.label,
      title: this.title,
    };
  }
}
