import { either as e } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";

export type ValidateAuthenticationRequestArgs = {
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
  return pipe(
    validateArgs(args),
    e.chain(ensureOpenIdScopeIsPresent),
    e.chain(ensureFormPostResponseMode),
    e.chain(ensureIdTokenResponseType),
    e.chain(ensurePromptIsNone),
    e.map(() => {}),
  );
}

function validateArgs(args: unknown) {
  const argsIsObject = !args || typeof args === "object";
  if (argsIsObject) return e.right(args as ValidateAuthenticationRequestArgs);

  const error = new MalformedRequestError("It is not a valid LTI authentication request.", "body");
  return e.left(error);
}

function ensureOpenIdScopeIsPresent(args: ValidateAuthenticationRequestArgs) {
  const hasOpenIdScope = typeof args.scope === "string" && args.scope.includes("openid");
  if (hasOpenIdScope) return e.right(args);

  const error = new MalformedRequestError(
    "Request's OAuth scopes should include 'openid'.",
    "scope",
  );

  return e.left(error);
}

function ensureFormPostResponseMode(args: ValidateAuthenticationRequestArgs) {
  const responseModeIsFormPost = args.response_mode === "form_post";
  if (responseModeIsFormPost) return e.right(args);

  const error = new MalformedRequestError(
    "'response_mode' parameter must be 'form_post'.",
    "response_mode",
  );

  return e.left(error);
}

function ensureIdTokenResponseType(args: ValidateAuthenticationRequestArgs) {
  const responseTypeIsIdToken = args.response_type === "id_token";
  if (responseTypeIsIdToken) return e.right(args);

  const error = new MalformedRequestError("'response_type' must be 'id_token'.", "response_type");
  return e.left(error);
}

function ensurePromptIsNone(args: ValidateAuthenticationRequestArgs) {
  const promptIsNone = args.prompt === "none";
  if (promptIsNone) return e.right(args);

  const error = new MalformedRequestError("'prompt' must be 'none'.", "prompt");
  return e.left(error);
}
