import { randomBytes } from "node:crypto";
import { either as e } from "fp-ts";
import { validateLtiIso8601AndPreciseTimestamp } from "./validate-lti-iso-8601-precise-timestamp";

describe("[AGS] Score timestamps validateIso8601 helper", () => {
  it.each([
    ["2024-05-10T12:00:00.123Z", "that are valid"],
    ["2024-05-10T12:00:00.123Z", "with sub-second and timezone designator with uppercase Z"],
    ["2024-05-10T12:00:00.123z", "with sub-second and timezone designator with lowercase z"],
    ["2024-05-10T12:00:00.123+03:00", "with sub-seconds and timezone offset (with ':')"],
    ["2024-05-10T12:00:00.123-0500", "with sub-seconds and timezone offset (with compact syntax)"],
  ])("should accept timestamps $1", (input) => {
    const result = validateLtiIso8601AndPreciseTimestamp(input);
    expect(result, "with lowercase 'Z'").toEqual(e.right(new Date(input)));
  });

  it("should reject valid datetimes that has no sub-second precision", () => {
    // lacking .xyz sub-seconds
    const input = "2024-05-10T12:00:00Z";
    const result = validateLtiIso8601AndPreciseTimestamp(input);
    expect(result).toEqual(e.left("missing_sub_second_precision"));
  });

  it("should reject datetimes that has sub-seconds precision but not timezone designator", () => {
    // has no Z nor +HH:MM
    const input = "2024-05-10T12:00:00.123";
    const result = validateLtiIso8601AndPreciseTimestamp(input);
    expect(result).toEqual(e.left("missing_timezone_designator"));
  });

  it.each(["banana", "", "invalid-date-string", randomBytes(12).toString()])(
    "should reject random or invalid datetime strings",
    () => {
      const result = validateLtiIso8601AndPreciseTimestamp("banana");
      expect(result).toEqual(e.left("invalid_datetime"));
    },
  );
});
