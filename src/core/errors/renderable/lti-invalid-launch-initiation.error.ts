import { TranslatorService } from "@/message-string/translator.service.js";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error.js";
import { ErrorClassProperties } from "../error-base.js";
import { RenderableError } from "./renderable-error.js";

type Args = ErrorClassProperties<RenderableLtiInvalidLaunchInitiationError>;

export class RenderableLtiInvalidLaunchInitiationError extends RenderableError {
  public readonly cause: InvalidLaunchInitiationError;

  public constructor({ cause, ...args }: Args) {
    super(args, RenderableLtiInvalidLaunchInitiationError.name);
    this.cause = cause;
  }

  public static async create(cause: InvalidLaunchInitiationError, t: TranslatorService) {
    return new RenderableLtiInvalidLaunchInitiationError({
      cause,
      status: cause.httpStatusCode,
      view: "errors/lti-launch-initiation-error",
      viewProperties: {
        title: await t.translate("lti:initiate-launch:invalid-launch-error:title"),
        message: await t.translate(`lti:initiate-launch:invalid-launch-error:${cause.reason}`),
        originalMessage: cause.message,
        originalReason: cause.reason,
      },
    });
  }
}
