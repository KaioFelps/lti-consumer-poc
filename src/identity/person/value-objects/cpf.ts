import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";

export class CPF {
  private constructor(private value: string) {}

  public toString() {
    return this.value;
  }

  public static createUnchecked(value: string): CPF {
    return new CPF(value);
  }

  /**
   * Tries to parse a CPF from a string input.
   *
   * @param cpfString the input CPF string
   * @param argumentName an optional name of the argument for a possible error message string
   * @returns either an `CPF` instance or an `InvalidArgumentError` if the string is not a valid CPF.
   */
  public static parseFromString(
    cpfString: string,
  ): Either<InvalidArgumentError, CPF> {
    // TODO: *really* validate a CPF, what goes beyond checking if its numeric and has 11 chars
    const cpfAlphanumericChars = cpfString.replaceAll(".", "").replace("-", "");

    if (Number.isNaN(Number(cpfAlphanumericChars))) {
      const error = new InvalidArgumentError(
        "identity:person:cpf:non-numeric-chars",
      );

      return either.left(error);
    }

    if (cpfAlphanumericChars.length !== 11) {
      const error = new InvalidArgumentError("identity:person:cpf:invalid-cpf");

      return either.left(error);
    }

    return either.right(new CPF(cpfAlphanumericChars));
  }
}
