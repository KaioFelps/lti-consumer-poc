import { Optional } from "common/src/types/optional";
import { generateUUID, UUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { LtiResourceLink } from "$/core/resource-link";
import { ExternalLtiResource } from "../advantage/external-resource";
import { InvalidLineItemArgumentError } from "./errors/invalid-line-item-argument.error";

interface ILtiLineItem {
  /**
   * The _real_ ID of the line item within the platform. Note that this *is not* the
   * line item ID described by the [LTI AGS specification].
   *
   * [LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0
   */
  id: UUID | string | number;
  /**
   * A description of this line item, as stated by [LTI AGS specification].
   *
   * [LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0
   */
  label: string;
  /**
   * The maximum expected score within this line item.
   *
   * Note that this value does not imply
   * the maximum score to be found in every result belonging to this line item, since
   * the [LTI AGS specification] defines that a platform must accept a score bigger than
   * `scoreMaximum`.
   *
   * [LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0
   */
  scoreMaximum: number;
  /**
   * The LTI resource link associated to this line item. If present, must belong to the same context
   * as the line item and must belong to the tool trying to create this line item.
   *
   * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
   */
  resourceLink?: LtiResourceLink;
  /**
   * The external LTI tool's resource associated to this line item.
   *
   * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
   */
  resource?: ExternalLtiResource;
  /**
   * A tag the LTI tool may set to this line item.
   *
   * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
   */
  tag?: string;
  /**
   * The ISO 8601 date and time when the line item becomes available to receive submissions.
   * If undefined, the platform does not enforce a start date or the feature is disabled.
   *
   * @example "2026-02-16T21:00:00.000Z"
   *
   * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
   */
  startDateTime?: Date;

  /**
   * The ISO 8601 date and time after which no more submissions will be accepted for this line item.
   * Represents the formal deadline for the activity.
   *
   * @example "2026-12-31T23:59:59.999Z"
   *
   * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
   */
  endDateTime?: Date;

  /**
   * Whether the tool expects the grades to be visible to the students in the platform's gradebook already.
   *
   * If `undefined`, it's up to the platform to decide whether it should or not be visible. The platform
   * can also ignore this flag, since it owns the gradebook.
   *
   * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
   */
  gradesReleased?: boolean;
}

/**
 * A representation of a row from the platform's gradebook.
 *
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
 */
export class LtiLineItem implements ILtiLineItem {
  public readonly startDateTime?: Date | undefined;
  public readonly endDateTime?: Date | undefined;

  private constructor(
    public readonly id: number | UUID | string,
    public readonly label: string,
    public readonly scoreMaximum: number,
    public readonly resourceLink?: LtiResourceLink | undefined,
    public readonly resource?: ExternalLtiResource | undefined,
    public readonly tag?: string,
    public readonly gradesReleased?: boolean | undefined,
    startDateTime?: Date | undefined,
    endDateTime?: Date | undefined,
  ) {
    if (startDateTime) this.startDateTime = new Date(startDateTime);
    if (endDateTime) this.endDateTime = new Date(endDateTime);
  }

  public static create({
    id = generateUUID(),
    ...args
  }: Optional<ILtiLineItem, "id">): Either<InvalidLineItemArgumentError, LtiLineItem> {
    if (args.scoreMaximum <= 0) {
      return e.left(new InvalidLineItemArgumentError("scoreMaximum", "must_be_greater_than_zero"));
    }

    const label = args.label.trim();
    if (!label) return e.left(new InvalidLineItemArgumentError("label", "required"));

    return e.right(
      new LtiLineItem(
        id,
        label,
        args.scoreMaximum,
        args.resourceLink,
        args.resource,
        args.tag,
        args.gradesReleased,
        args.startDateTime,
        args.endDateTime,
      ),
    );
  }
}
