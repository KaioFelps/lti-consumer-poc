import { JsonValue } from "common/src/types/json-value";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { InvalidLineItemArgumentError } from "$/assignment-and-grade/errors";

export type RawCustomParameters = Record<string, JsonValue>;

export class CustomParameters {
  public constructor(private parameters: Record<string, JsonValue> = {}) {}

  public toValue(): Readonly<Record<string, JsonValue>> {
    return structuredClone(this.parameters);
  }

  public add(key: string, value: JsonValue) {
    return pipe(
      e.tryCatch(
        () => new URL(key),
        (_) =>
          new InvalidLineItemArgumentError("customParameters", "key_must_be_fully_qualified_url"),
      ),
      e.map(() => {
        this.parameters[key] = value;
      }),
    );
  }

  public remove(key: string) {
    delete this.parameters[key];
  }
}
