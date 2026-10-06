import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

type Reason = "invalid_datetime" | "missing_subsecond_precision" | "missing_timezone_designator";

interface ValidationOptions {
  /**
   * If true, enforces strict LTI/ISO 8601 compliance (requires sub-second precision).
   * Otherwise, it performs a relaxed validation to support LMSs like Moodle.
   
   * @default true
   */
  strictMode?: boolean;
}

const TIMEZONE_REGEX = /(Z|[+-]\d{2}(:?\d{2})?)$/i;
const SUBSECOND_PRECISION_REGEX = /\.\d+/;

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
  { strictMode = true }: ValidationOptions = {},
): Either<Reason, Date> {
  // there ain't no way of validating everything if it's been coerced to Date already...
  if (timestamp instanceof Date) {
    return Number.isNaN(timestamp.getTime()) ? e.left("invalid_datetime") : e.right(timestamp);
  }

  const asDate = new Date(timestamp);
  if (Number.isNaN(asDate.getTime())) return e.left("invalid_datetime");

  if (strictMode) {
    const hasSubSecondPrecision = SUBSECOND_PRECISION_REGEX.test(timestamp);
    if (!hasSubSecondPrecision) return e.left("missing_subsecond_precision");
  }

  const hasTimeZoneDesignator = TIMEZONE_REGEX.test(timestamp);
  return hasTimeZoneDesignator ? e.right(asDate) : e.left("missing_timezone_designator");
}
