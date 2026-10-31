import { resolveStatus } from "@/lib/exceptions.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { type IErrorBase } from "../error-base.js";
import { RenderableError } from "./renderable-error.js";

export class ErrorBaseRenderableError extends RenderableError {
  protected constructor(innerError: IErrorBase, viewProperties: RenderableError["viewProperties"]) {
    super(
      {
        view: "errors/basic",
        viewProperties,
        status: resolveStatus(innerError),
      },
      ErrorBaseRenderableError.name,
    );
  }

  public static async create(innerError: IErrorBase, t: TranslatorService) {
    return new ErrorBaseRenderableError(innerError, {
      title: await t.translate("core:error"),
      message: await t.translate(innerError.errorMessageIdentifier, innerError.messageParams),
    });
  }
}
