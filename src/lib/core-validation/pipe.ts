import {
  ArgumentMetadata,
  Inject,
  Injectable,
  Paramtype,
  PipeTransform,
  Scope,
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { plainToInstance } from "class-transformer";
import { unflatten } from "flat";
import { either } from "fp-ts";
import type { DTO } from "@/core/interfaces/dto.js";
import { DTOValidationException } from "@/lib/exceptions/dto-validation/exception.js";
import type { HttpRequest } from "@/lib.js";
import coreValidation from "../core-validation.js";
import { RenderableDtoValidationException } from "../exceptions/renderable-dto-validation/exception.js";
import mvcRoutes from "../mvc-routes.js";

/**
 * Validates the body parameter (decorated with `@Body()`).
 * The body value must be an instance of some class which
 * implements the `DTO` interface.
 */
@Injectable({ scope: Scope.REQUEST })
export class CoreValidationPipe implements PipeTransform {
  @Inject(REQUEST) private request!: HttpRequest;

  transform(value: unknown, metadata: ArgumentMetadata) {
    const workableTypes: Paramtype[] = ["body", "query", "param"];

    if (!workableTypes.includes(metadata.type)) return value;

    if (!metadata.metatype)
      throw new Error(
        "The body value needs to have an explicit type. Ensure it has a proper " +
          "type and that it is a concrete class instead of a type or interface.",
      );

    const isDtoCompliant =
      "validate" in metadata.metatype.prototype &&
      typeof metadata.metatype.prototype.validate === "function" &&
      // avoid undefined bodies that should be validated
      value !== undefined;

    if (!isDtoCompliant) return value;

    const config = coreValidation.getConfigsFromRequest(this.request);

    if (config.shallUnflatten !== false) value = unflatten(value);

    const valueAsInstanceOfADto: DTO = plainToInstance(metadata.metatype, value, {
      excludeExtraneousValues: true,
      strategy: "excludeAll",
    });

    const isValid = valueAsInstanceOfADto.validate();
    if (either.isRight(isValid)) return valueAsInstanceOfADto;

    const validationErrors = isValid.left;

    const shouldRender =
      this.request[mvcRoutes.requestKey] &&
      !!config.renderErrorsWithView &&
      this.request.method.toLowerCase() === "get";

    if (shouldRender) {
      const view = config.renderErrorsWithView!;
      throw new RenderableDtoValidationException(validationErrors, view, config.status);
    }

    throw new DTOValidationException(validationErrors, config.status);
  }
}
