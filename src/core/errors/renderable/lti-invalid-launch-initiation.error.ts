import { TranslatorService } from "@/message-string/translator.service";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error";
import { ErrorClassProperties } from "../error-base";
import { RenderableError } from "./renderable-error";

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
