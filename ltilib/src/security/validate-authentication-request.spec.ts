import { either as e } from "fp-ts";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";
import { validateAuthenticationRequest } from "./validate-authentication-request";

describe("[Core] validateAuthenticationRequest", async () => {
  const validArgs = {
    response_mode: "form_post",
    response_type: "id_token",
    prompt: "none",
    scope: "openid",
  };

  it("should validate a correct LTI request", () => {
    const result = validateAuthenticationRequest(validArgs);
    expect(e.isRight(result)).toBe(true);
  });

  it.each(
    [
      { overrides: { response_mode: "query" }, wrongField: "response_mode" },
      { overrides: { response_type: "code" }, wrongField: "response_type" },
      { overrides: { prompt: "login" }, wrongField: "prompt" },
      { overrides: { scope: "profile" }, wrongField: "scope" },
    ].map((args) => ({ ...args, expected: validArgs[args.wrongField] })),
  )("should fail when $error is not $expected", ({ overrides, wrongField }) => {
    const invalidArgs = { ...validArgs, ...overrides };
    const result = validateAuthenticationRequest(invalidArgs);

    assert(e.isLeft(result));
    expect(result.left).toBeInstanceOf(MalformedRequestError);

    if (!(result.left instanceof MalformedRequestError)) return;

    expect(result.left.cause).toBe(wrongField);
  });

  it.each([true, "arbitrary-string", 100, 10.5, []])(
    "should fail if args is not an object",
    (wrongArg) => {
      const result = validateAuthenticationRequest(wrongArg);
      expect(e.isLeft(result)).toBe(true);
    },
  );
});
