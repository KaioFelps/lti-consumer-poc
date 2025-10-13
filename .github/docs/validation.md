# Validation

Request bodies can be validated using DTO classes (which implement the `DTO` interface).
Zod or any other library can be used for validating the data. Custom validation can also be checked
within the `validate` method enforced by the `DTO` interface.

The return type of a DTO must be a `Either<ValidationErrors, undefined>`. I.e., it must return
no errors nor anything but `undefined` if the DTO data is valid, but an instance of `ValidationErrors`
if there is at least one validation error.

The `ValidationErrors` returned by this method contains a ready-to-use error object in a core-level
format that can be returned by any validation function across the application and readily be
serialized as a JSON response.

A [pipe] will run on errors to translate the message strings identifiers into locale strings using
the [Message String](./message-string.md) module.

## Where to place DTOs

Place your DTOs inside the module directory, in a `dtos/` subdirectory. A DTO must be in a
`.dto.ts` file, and the class must have the "DTO" suffix.

Your errors must not return a real message on validation error, but rather a message string
identifier.

Make sure to manually set the `argumentName` property when instantiating a `InvalidArgumentError`
so that it is correctly displayed when the error be exposed as a JSON.

## Example
```ts
import { Expose } from "class-transformer";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import z from "zod";
import { DTO } from "@/core/dto";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { ValidationErrors } from "@/core/validation/validation-errors";
import { mapZodErrorsToCoreValidationErrors } from "@/lib/zod/map-zod-errors-to-core-validation-error";

export class BazDTO implements DTO {
  protected static fooSchema = z.object({
    bar: z.string({ error: "my-module:baz:bar-invalid-type" }),
    foo: z.boolean({ error: "my-module:baz:foo-invalid-type" }),
  });

  @Expose()
  public readonly bar: string;

  @Expose()
  public readonly foo: boolean;

  validate(): Either<ValidationErrors, void> {
    const { success, error: errors } = BazDTO.fooSchema.safeParse(this);
    if (success) return either.right(undefined);
    return either.left(mapZodErrorsToCoreValidationErrors(validationErrors));
  }
}
```

`mapZodErrorsToCoreValidationErrors` is a simple function which iterates over each zod validation error
and inserts the error as an `InvalidArgumentError` inside a `ValidationErrors` instance, using
the error message set at the schema as an `errorMessageIdentifier`.

Note that you **must decorate each property** with `@Expose()`. The validation pipe removes
any unknown property from body, and class-transform ignores non-exposed properties during this
verification.

The validation pipe *sets the strategy to "exposeAll"*, however, there is a
[4-year-old](https://github.com/typestack/class-transformer/issues/740) bug that won't expose
every property anyway, forcing us to manually expose each one exhaustively.

## Message Strings
Be sure your `InvalidArgumentError`'s `errorMessageIdentifier` value **is always a valid
message string identifier**. After every request, the `DTOValidationExceptionFilter` will be
called and, if the response is an instance of `DTOValidationException`, it will translate
every message string by its identifier.

As specified at [Message Strings] guide, unrecognized identifiers will trigger an
`IrrecoverableError`.

[Message Strings]: ./message-string.md#unrecognized-identifiers-and-string-maps
