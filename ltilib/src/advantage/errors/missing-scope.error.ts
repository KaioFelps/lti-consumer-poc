export class MissingScopeError extends Error {
  public constructor(
    public readonly misisngScopes: string | string[],
    public readonly which: "any" | "every",
  ) {
    super();
  }
}

export class MissingAnyScopeError extends MissingScopeError {
  public constructor(scopes: string | string[]) {
    super(scopes, "any");
  }
}

export class MissingScopesError extends MissingScopeError {
  public constructor(scopes: string | string[]) {
    super(scopes, "every");
  }
}
