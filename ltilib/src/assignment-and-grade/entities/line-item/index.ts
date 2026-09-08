import { JsonValue } from "common/src/types/json-value";
import { Optional } from "common/src/types/optional";
import { generateUUID, type UUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { ExternalLtiResource } from "$/advantage/external-resource";
import {
  CannotAttachResourceLinkError,
  InvalidLineItemArgumentError,
} from "$/assignment-and-grade/errors";
import { Context } from "$/core/context";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiTool } from "$/core/tool";
import { CustomParameters, RawCustomParameters } from "./custom-parameters";
import { setCustomParameters, validateLabel, validateScoreMaximum } from "./helpers";

import * as updateRecord from "./update-record";

export interface ILtiLineItem<CustomContextType = never> {
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
  externalResource?: ExternalLtiResource;
  /**
   * The LTI {@link Context `Context`} to which this line item belongs.
   */
  context: Context<CustomContextType>;
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
  /**
   * Optional custom parameters as per [section 3.1.2 of LTI AGS specification].
   *
   * [section 3.1.2 of LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0#extensions
   */
  customParameters?: RawCustomParameters;
}

/**
 * A representation of a row from the platform's gradebook.
 *
 * @see {@link https://www.imsglobal.org/spec/lti-ags/v2p0 LTI AGS specification}
 */
export class LtiLineItem<CustomContextType = unknown> implements ILtiLineItem<CustomContextType> {
  public startDateTime?: Date | undefined;
  public endDateTime?: Date | undefined;
  protected _customParameters = new CustomParameters();

  private constructor(
    public readonly id: number | UUID | string,
    public label: string,
    public scoreMaximum: number,
    public readonly context: Context<CustomContextType>,
    private _resourceLink?: LtiResourceLink | undefined,
    public readonly externalResource?: ExternalLtiResource | undefined,
    public readonly tag?: string,
    public gradesReleased?: boolean | undefined,
    startDateTime?: Date | undefined,
    endDateTime?: Date | undefined,
  ) {
    if (startDateTime) this.startDateTime = new Date(startDateTime);
    if (endDateTime) this.endDateTime = new Date(endDateTime);
  }

  public static create<CustomContextType = never>({
    id = generateUUID(),
    customParameters = {},
    ...args
  }: Optional<ILtiLineItem<CustomContextType>, "id">): Either<
    InvalidLineItemArgumentError,
    LtiLineItem<CustomContextType>
  > {
    return pipe(
      e.Do,
      e.chainFirstW(() => validateScoreMaximum(args.scoreMaximum)),
      e.bindW("label", () => validateLabel(args.label)),
      e.let(
        "lineItem",
        ({ label }) =>
          new LtiLineItem(
            id,
            label,
            args.scoreMaximum,
            args.context,
            undefined,
            args.externalResource,
            args.tag,
            args.gradesReleased,
            args.startDateTime,
            args.endDateTime,
          ),
      ),
      e.chainFirstW(({ lineItem }) =>
        setCustomParameters(lineItem._customParameters, customParameters),
      ),
      e.chainFirstW(({ lineItem }) => lineItem.setResourceLink(args.resourceLink)),
      e.map(({ lineItem }) => lineItem),
    );
  }

  /**
   * Recreates a instance of a {@link LtiLineItem `LtiLineItem`} that already existed previously.
   * This is useful to restore entities persisted in some storage out of memory.
   *
   * @note It does not perform any security or conformance check. Make sure your line item is
   * created by {@link create} at first.
   */
  public static createUnchecked<CustomContextType = never>(props: ILtiLineItem<CustomContextType>) {
    const lineItem = new LtiLineItem(
      props.id,
      props.label,
      props.scoreMaximum,
      props.context,
      props.resourceLink,
      props.externalResource,
      props.tag,
      props.gradesReleased,
      props.startDateTime,
      props.endDateTime,
    );
    lineItem._customParameters = new CustomParameters({ ...props.customParameters });
    return lineItem;
  }

  public get customParameters(): Readonly<RawCustomParameters> {
    return this._customParameters.toValue();
  }

  public addCustomParameter(key: string, value: JsonValue) {
    return this._customParameters.add(key, value);
  }

  public removeCustomParameter(key: string) {
    return this._customParameters.remove(key);
  }

  public isAccessibleToTool(tool: LtiTool) {
    const toolOwnsByResourceLink = !this._resourceLink || this._resourceLink.belongsToTool(tool);
    const toolOwnsByResource = !this.externalResource || this.externalResource.belongsToTool(tool);
    return toolOwnsByResourceLink && toolOwnsByResource;
  }

  public belongsToContext(context: Context<CustomContextType>) {
    return this.context.id === context.id;
  }

  public get resourceLink() {
    return this._resourceLink;
  }

  public setResourceLink(resourceLink: LtiResourceLink | undefined) {
    if (!this.canAttachResourceLink(resourceLink)) {
      return e.left(new CannotAttachResourceLinkError("must_belong_to_lineitem_context"));
    }

    this._resourceLink = resourceLink;
    return e.right(undefined);
  }

  private canAttachResourceLink(resourceLink: LtiResourceLink | undefined) {
    return !resourceLink || resourceLink.belongsToContext(this.context);
  }
}

export namespace LtiLineItem {
  export const { UpdateRecord } = updateRecord;
  export type UpdateRecord = updateRecord.UpdateRecord;
}
