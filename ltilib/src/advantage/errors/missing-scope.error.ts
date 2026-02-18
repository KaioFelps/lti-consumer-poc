import { IOAuthBearerError, OAuthBearerError } from "$/core/errors/oauth-bearer.error";

type Options = {
  errorUri?: IOAuthBearerError["errorUri"];
  realm?: IOAuthBearerError["realm"];
};

export class MissingScopeError extends OAuthBearerError {
  public constructor(
    public readonly missingScopes: string | string[],
    public readonly which: "any" | "every",
    message: string,
    options?: Options,
  ) {
    const resolvedScopes = Array.isArray(missingScopes) ? missingScopes.join(" ") : missingScopes;

    super({
      error: "insufficient_scope",
      errorDescription: message,
      scope: resolvedScopes,
      errorUri: options?.errorUri,
      realm: options?.realm,
    });
  }

  public present(): object {
    return {
      ...super.present(),
      scope: Array.isArray(this.missingScopes) ? this.missingScopes.join(" ") : this.missingScopes,
    };
  }
}

export class MissingAnyScopeError extends MissingScopeError {
  public constructor(scopes: string | string[], options?: Options) {
    super(
      scopes,
      "any",
      `At least one of the following scopes must be present: ${listScopes(scopes)}.`,
      options,
    );
  }
}

export class MissingEveryScopesError extends MissingScopeError {
  public constructor(scopes: string | string[], options?: Options) {
    super(
      scopes,
      "every",
      `All of the following scopes are required: ${listScopes(scopes)}.`,
      options,
    );
  }
}

function listScopes(scopes: string | string[]): string {
  const quoteScope = (scope: string) => `"${scope}"`;
  const stringifiedScopes = (Array.isArray(scopes) ? scopes : [scopes]).map(quoteScope);
  const scopesList = new Intl.ListFormat("en-US").format(stringifiedScopes);
  return scopesList;
}
