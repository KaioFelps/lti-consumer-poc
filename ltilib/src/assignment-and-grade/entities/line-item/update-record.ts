import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ExternalLtiResource } from "$/advantage/external-resource";
import { setCustomParameters, validateLabel, validateScoreMaximum } from "../helpers";
import { LtiLineItem as LineItem } from ".";
import { CustomParameters, RawCustomParameters } from "./custom-parameters";

interface IUpdateRecord {
  /**
   * The actual ID of the line item local to the platform.
   */
  id: LineItem["id"];
  /**
   * The new label of the line item.
   */
  label: string;
  /**
   * The new score limit of this line item.
   * The platform may ignore this. If aplied, it's up to the platform to scale the results,
   * as per [section 3.2.6].
   *
   * [section 3.2.6]: https://www.imsglobal.org/spec/lti-ags/v2p0#updating-a-line-item
   */
  scoreMaximum: number;
  /**
   * The new resource ID to which this line item must be associated.
   */
  externalResource?: ExternalLtiResource;
  /**
   * The new start date.
   */
  startDateTime?: Date | null;
  /**
   * The new end date.
   */
  endDateTime?: Date | null;
  /**
   * The new tag.
   */
  tag?: string;
  /**
   * Whether the platform should immediately display the grades or not.
   */
  gradesReleased?: boolean;
  /**
   * The custom parameters as per [section 3.1.2 of LTI AGS specification].
   *
   * [section 3.1.2 of LTI AGS specification]: https://www.imsglobal.org/spec/lti-ags/v2p0#extensions
   */
  customParameters?: RawCustomParameters;
}

/**
 * A payload of changes to be applied to the line item identified by `lineItemId`.
 * Every change must be applied (unless otherwise stated).
 */
export class UpdateRecord implements IUpdateRecord {
  public constructor(
    public readonly id: IUpdateRecord["id"],
    public readonly label: IUpdateRecord["label"],
    public readonly scoreMaximum: IUpdateRecord["scoreMaximum"],
    public readonly externalResource?: IUpdateRecord["externalResource"],
    public readonly startDateTime?: IUpdateRecord["startDateTime"],
    public readonly endDateTime?: IUpdateRecord["endDateTime"],
    public readonly tag?: IUpdateRecord["tag"],
    public readonly gradesReleased?: IUpdateRecord["gradesReleased"],
  ) {
    if (startDateTime) this.startDateTime = new Date(startDateTime);
    if (endDateTime) this.endDateTime = new Date(endDateTime);
  }

  private parameters: CustomParameters = new CustomParameters();

  public get customParameters() {
    return this.parameters.toValue();
  }

  public static create(args: IUpdateRecord) {
    return pipe(
      e.Do,
      e.chainFirstW(() => validateScoreMaximum(args.scoreMaximum)),
      e.bindW("label", () => validateLabel(args.label)),
      e.let(
        "record",
        ({ label }) =>
          new UpdateRecord(
            args.id,
            label,
            args.scoreMaximum,
            args.externalResource,
            args.startDateTime,
            args.endDateTime,
            args.tag,
            args.gradesReleased,
          ),
      ),
      e.chainFirstW(({ record }) => setCustomParameters(record.parameters, args.customParameters)),
      e.map(({ record }) => record),
    );
  }
}
