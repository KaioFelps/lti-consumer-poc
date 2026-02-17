import { either, option } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { Option } from "fp-ts/lib/Option";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";

export class CPF {
  private digits: Uint8Array;

  private constructor(value: string) {
    value = value.replaceAll(".", "").replaceAll("-", "");
    this.digits = Uint8Array.from(value);
  }

  /**
   * @returns CPF digits only.
   */
  public toRawString() {
    return this.digits.join("").toString();
  }

  /**
   * @returns CPF digits in "XXX.XXX.XXX-XX" format.
   */
  public toString() {
    return (
      this.digits.slice(0, 3).join("") +
      "." +
      this.digits.slice(3, 6).join("") +
      "." +
      this.digits.slice(6, 9).join("") +
      "-" +
      this.digits.slice(9, 11).join("")
    );
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
  public static parseFromString(cpfString: string): Either<InvalidArgumentError, CPF> {
    return pipe(
      CPF.validateCPFString(cpfString),
      option.fold(
        () => either.right(new CPF(cpfString)),
        (error) => either.left(error),
      ),
    );
  }

  // TODO: *really* validate a CPF, what goes beyond checking if its numeric and has 11 chars
  public static validateCPFString(cpfString: string): Option<InvalidArgumentError> {
    const trimmedCPF = cpfString.replaceAll(".", "").replace("-", "").trim();

    if (Number.isNaN(Number(trimmedCPF))) {
      const error = new InvalidArgumentError({
        errorMessageIdentifier: "identity:person:cpf:non-numeric-chars",
      });

      return option.some(error);
    }

    if (trimmedCPF.length !== 11) {
      const error = new InvalidArgumentError({
        errorMessageIdentifier: "identity:person:cpf:invalid-cpf",
      });
      return option.some(error);
    }

    return option.none;
  }
}
