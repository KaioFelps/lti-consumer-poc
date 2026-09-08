import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

type Reason = "invalid_datetime" | "missing_sub_second_precision" | "missing_timezone_designator";

/**
 * Validates `timestamp` is conformant with ISO 8601 and AGS specs that require
 * sub-second precision and timezones designators.
 *
 * @note It's preferred that `timestamp` be a raw datetime `string`, since validation can be
 * fully performed as per LTI specifications — with sub-seconds precision & timezone designators.
 *
 * @returns Either a {@link Reason `Reason`} code explaining the reason why it's invalid
 * or the timestamp parsed as a `Date` instance.
 */
export function validateLtiIso8601AndPreciseTimestamp(
  timestamp: Date | string,
): Either<Reason, Date> {
  // there ain't no way of validating everything if it's been coerced to Date already...
  if (timestamp instanceof Date) {
    return Number.isNaN(timestamp.getTime()) ? e.left("invalid_datetime") : e.right(timestamp);
  }

  const asDate = new Date(timestamp);
  if (Number.isNaN(asDate.getTime())) return e.left("invalid_datetime");

  const hasSubSecondPrecision = /\.\d+/.test(timestamp);
  if (!hasSubSecondPrecision) return e.left("missing_sub_second_precision");

  const hasTimeZoneDesignator = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(timestamp);
  return hasTimeZoneDesignator ? e.right(asDate) : e.left("missing_timezone_designator");
}
