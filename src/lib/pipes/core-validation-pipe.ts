import { ArgumentMetadata, PipeTransform } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { either } from "fp-ts";
import type { DTO } from "@/core/interfaces/dto";
import { DTOValidationException } from "@/lib/exceptions/dto-validation/exception";

/**
 * Validates the body parameter (decorated with `@Body()`).
 * The body value must be an instance of some class which
 * implements the `DTO` interface.
 */
export class CoreValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== "body") return value;

    if (!metadata.metatype)
      throw new Error(
        "The body value needs to have an explicit type. Ensure it has a proper " +
          "type and that it is a concrete class instead of a type or interface.",
      );

    if (
      !("validate" in metadata.metatype.prototype) ||
      typeof metadata.metatype.prototype.validate !== "function"
    ) {
      // Help developer find out whether the value type is a class
      // which implements the DTO interface.
      throw new Error(
        metadata.metatype
          ? `Class ${metadata.metatype.name} does not implement DTO interface.`
          : "The body value has not received any class prototype to be validated. Either type the body parameter or remove `CoreValidationPipe` from the pipeline.",
      );
    }

    const valueAsInstanceOfADto: DTO = plainToInstance(
      metadata.metatype,
      value,
      {
        excludeExtraneousValues: true,
        strategy: "excludeAll",
      },
    );

    const isValid = valueAsInstanceOfADto.validate();
    if (either.isLeft(isValid)) throw new DTOValidationException(isValid.left);
    return valueAsInstanceOfADto;
  }
}
