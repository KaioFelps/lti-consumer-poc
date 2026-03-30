import { either as e } from "fp-ts";
import { NotAcceptableMediaTypeError } from "../errors/not-acceptable-media-type.error";
import { LtiAdvantageMediaType } from "../media-types";
import { ensureMediaTypeIsAccepted } from "./ensure-media-type-is-accepted";

describe("[LTI Advantage/GUARDS] Ensure Media Type Is Accepted", () => {
  const availableMediaType = LtiAdvantageMediaType.LineItemContainer;

  it.each([
    ["undefined", undefined],
    ["empty string", ""],
    ["global wildcard", "*/*"],
    ["application wildcard", "application/*"],
    [
      "global wildcard with quality parameter",
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ],
    ["application wildcard mixed with others", "text/html, application/*, text/plain"],
    ["exact available media type", availableMediaType],
    ["exact available media type with spaces", `  ${availableMediaType}  `],
    [
      "exact available media type mixed with others",
      `text/html, ${availableMediaType}, application/json`,
    ],
    ["exact available media type with quality parameter", `${availableMediaType};q=0.9`],
    [
      "mixed list containing exact match with quality param",
      `text/html, ${availableMediaType};q=0.8, application/json`,
    ],
  ])("should allow it when Accept header is %s (%s)", async (_, acceptHeader) => {
    const result = await ensureMediaTypeIsAccepted(acceptHeader, availableMediaType)();
    assert(e.isRight(result));
    expect(result.right).toBeUndefined();
  });

  it.each([
    ["a completely different media type", "application/json"],
    ["a list of different media types", "text/html, application/xml, text/plain"],
    [
      "a false-positive string prefix (as per code comments)",
      `${availableMediaType}-invalid-suffix`,
    ],
    ["a false-positive with quality params", `${availableMediaType}-invalid;q=0.9`],
  ])(
    "should return NotAcceptableMediaTypeError when Accept header is %s (%s)",
    async (_, acceptHeader) => {
      const result = await ensureMediaTypeIsAccepted(acceptHeader, availableMediaType)();
      assert(e.isLeft(result));
      expect(result.left).toBeInstanceOf(NotAcceptableMediaTypeError);
      expect(result.left.httpStatusCode).toBe(406);
      expect(result.left.availableMediaType).toBe(availableMediaType);
    },
  );
});
