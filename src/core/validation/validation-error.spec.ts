import { InvalidArgumentError } from "../errors/invalid-argument.error";
import { ValidationErrors } from "./validation-errors";

describe("ValidationErrors", () => {
  it("should correctly append validation errors", () => {
    const validationErrors = new ValidationErrors();

    const error = new InvalidArgumentError({
      errorMessageIdentifier: "test:some:message:identifier",
      argumentName: "nonNestedArgument",
    });
    validationErrors.appendError(error);

    expect(validationErrors.getErrors()).toMatchObject({
      nonNestedArgument: [
        {
          errorMessageIdentifier: "test:some:message:identifier",
          argumentName: "nonNestedArgument",
          errorType: "InvalidArgumentError",
        },
      ],
    });
  });

  it("should correctly handle multiple validation errors under a same argument/field", () => {
    const validationErrors = new ValidationErrors();
    for (const id of ["test:identifier", "test:another-identifier"]) {
      validationErrors.appendError(
        new InvalidArgumentError({
          errorMessageIdentifier: id,
          argumentName: "nonNestedArgument",
        }),
      );
    }

    expect(validationErrors.getErrors()).toMatchObject({
      nonNestedArgument: [
        {
          errorMessageIdentifier: "test:identifier",
          argumentName: "nonNestedArgument",
          errorType: "InvalidArgumentError",
        },
        {
          errorMessageIdentifier: "test:another-identifier",

          argumentName: "nonNestedArgument",
          errorType: "InvalidArgumentError",
        },
      ],
    });
  });

  it("should handle validation of nested arguments from some schema", () => {
    const validationErrors = new ValidationErrors();

    for (const [errorMessageIdentifier, argumentName] of [
      ["test:identifier-1", "some.nested.arg"],
      ["test:identifier-2", "some.nested.arg"],
      ["test:identifier-1", "some.arg"],
      ["test:identifier-1", "some.nested.evenDeeper.arg"],
    ])
      validationErrors.appendError(
        new InvalidArgumentError({ errorMessageIdentifier, argumentName }),
      );

    expect(validationErrors.getErrors()).toMatchObject({
      some: {
        nested: {
          arg: [
            {
              errorMessageIdentifier: "test:identifier-1",
              argumentName: "some.nested.arg",
              errorType: "InvalidArgumentError",
            },
            {
              errorMessageIdentifier: "test:identifier-2",
              argumentName: "some.nested.arg",
              errorType: "InvalidArgumentError",
            },
          ],
          evenDeeper: {
            arg: [
              {
                errorMessageIdentifier: "test:identifier-1",
                argumentName: "some.nested.evenDeeper.arg",
                errorType: "InvalidArgumentError",
              },
            ],
          },
        },
        arg: [
          {
            errorMessageIdentifier: "test:identifier-1",
            argumentName: "some.arg",
            errorType: "InvalidArgumentError",
          },
        ],
      },
    });
  });
});
