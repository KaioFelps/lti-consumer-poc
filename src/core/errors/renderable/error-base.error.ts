import { resolveStatus } from "@/lib/exceptions";
import { TranslatorService } from "@/message-string/translator.service";
import { ErrorBase } from "../error-base";
import { RenderableError } from "./renderable-error";

export class ErrorBaseRenderableError extends RenderableError {
  protected constructor(innerError: ErrorBase, viewProperties: RenderableError["viewProperties"]) {
    super(
      {
        view: "errors/basic",
        viewProperties,
        status: resolveStatus(innerError),
      },
      ErrorBaseRenderableError.name,
    );
  }

  public static async create(innerError: ErrorBase, t: TranslatorService) {
    return new ErrorBaseRenderableError(innerError, {
      title: await t.translate("core:error"),
      message: await t.translate(innerError.errorMessageIdentifier, innerError.messageParams),
    });
  }
}
