import { Optional } from "common/src/types/optional";
import { generateUUID } from "common/src/types/uuid";
import { IntoLtiClaim } from "$/claims/serialization";

/**
 * The types that might describe an LTI context, inherited from 1EdTech LIS v2.0 specification.
 * @see https://www.imsglobal.org/node/52406
 */
export enum ContextType {
  /**
   * Represents a group of related `CourseOffering`s. E.g., every course offering
   * from Psychology 201 (2020.1, 2020.2, ..., 2026.1) and its sections.
   */
  CourseTemplate = "http://purl.imsglobal.org/vocab/lis/v2/course#CourseTemplate",
  /**
   * Represents an actual course. It's a collection many sections of some section
   * type (`CourseSection`) during the same academic term (e.g., every section of
   * the Psychology 201 class in the 2024.1 semester).
   */
  CourseOffering = "http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering",
  /**
   * Represents a logical subdivision of a course offering, typically used for
   * administrative or scheduling purposes (e.g., a specific class period or
   * cohort).
   */
  CourseSection = "http://purl.imsglobal.org/vocab/lis/v2/course#CourseSection",
  /**
   * Is a generic entity that acts like a building block to form a variety of
   * nested/hierarchical structures. Its primary usage is to group related info
   * within some course, aiming to isolate content or activities for a specific
   * subset of the course's scope.
   */
  Group = "http://purl.imsglobal.org/vocab/lis/v2/course#Group",
}

export interface IContext<CustomContextType = never> {
  /**
   * An unique and stable ID that identifies the context:
   * - globally in the platform;
   * - locally in the tool (i.e., there can be only one pair of [deployment_id, context.id] in the
   * platform side).
   */
  readonly id: string;
  /**
   * A list containing the applicable context types for this launch.
   * A plataform may (but should not) use custom context types — they must also
   * be fully resolved URIs.
   */
  type?: [ContextType, ...(CustomContextType | ContextType)[]];
  /**
   * A short and meaningful name for the context.
   */
  label?: string;
  /**
   * The descriptive full name of this context.
   */
  title?: string;
}

/**
 * An LTI context represents a group of related LTI items. I.e., when a collection of resources
 * are related to a specific course, this course is a context.
 */
export class Context<CustomContextType = never>
  implements IContext<CustomContextType>, IntoLtiClaim
{
  public readonly id: string;
  public type?: IContext<CustomContextType>["type"];
  public label?: string | undefined;
  public title?: string | undefined;

  protected constructor(args: IContext<CustomContextType>) {
    this.id = args.id;
    this.type = args.type;
    this.title = args.title;
    this.label = args.label;
  }

  // This allows us to return an `Either<Error, Context>` in the future with ease.
  public static create<CustomContextType = never>(
    args: Optional<IContext<CustomContextType>, "id">,
  ) {
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
