import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";

type ValidateAuthenticationRequestArgs = {
  response_mode: unknown;
  response_type: unknown;
  prompt: unknown;
  scope: unknown;
};

/**
 * Validates wether an authentication request is valid according to LTI specifications.
 * If not valid, an error must be immediately displayed to the user and no redirect
 * must be performed.
 */
export function validateAuthenticationRequest(
  args: ValidateAuthenticationRequestArgs | unknown,
): Either<MalformedRequestError, void> {
  if (!args || typeof args !== "object") {
    const error = new MalformedRequestError(
      "It is not a valid LTI authentication request.",
      "body",
    );

    return e.left(error);
  }

  const { response_mode, response_type, prompt, scope } = args as ValidateAuthenticationRequestArgs;

  const hasOpenIdScope = typeof scope === "string" && scope.includes("openid");
  if (!hasOpenIdScope) {
    const error = new MalformedRequestError(
      "Request's OAuth scopes should include 'openid'.",
      "scope",
    );

    return e.left(error);
  }

  if (response_mode !== "form_post") {
    const error = new MalformedRequestError(
      "'response_mode' parameter must be 'form_post'.",
      "response_mode",
    );

    return e.left(error);
  }

  if (response_type !== "id_token") {
    const error = new MalformedRequestError("'response_type' must be 'id_token'.", "response_type");

    return e.left(error);
  }

  if (prompt !== "none") {
    const error = new MalformedRequestError("'prompt' must be 'none'.", "prompt");

    return e.left(error);
  }

  return e.right(undefined);
}
