import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  Scope,
} from "@nestjs/common";
import { errors as joseErrors } from "jose";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { TranslatorService } from "@/message-string/translator.service";
import { assertNever } from "@/utils/assert-never";
import { AuthenticationRedirectionError } from "$/core/errors/authentication-redirection.error";
import { LtilibError } from "$/core/errors/bases/ltilib.error";
import { OAuthError } from "$/core/errors/bases/oauth.error";
import { CouldNotFindToolDueToExternalRepositoryError } from "$/core/errors/could-not-find-tool-due-to-external-error";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";
import { MisconfiguredPlatformError } from "$/core/errors/misconfigured-platform.error";
import { HttpResponse } from "../..";
import { BaseException } from "../base/exception";
import { BaseExceptionFilter } from "../base/exception-filter";
import { IrrecoverableException } from "../irrecoverable/exception";
import { RenderableException } from "../renderable/exception";
import { RenderableExceptionFilter } from "../renderable/exception-filter";
import { BaseErrorLtilibAdapter } from "./base-error-adapter";
import { LtilibException } from "./exception";

// it NEEDs to be request, since everything its injected through constructor is
// also built per request;
// if this is singletone, it'll stick with exception filters and translators that
// are stuck to requests and responses that has already died, and this will never
// get to answer the current request!
@Injectable({ scope: Scope.REQUEST })
/**
 * This exception filter responds upon errors as per specification (LTI) or
 * as suggested by ltilib.
 *
 * Often it does convert ltilib errors into domain errors to reuse existing
 * exception filters.
 */
@Catch(LtilibException)
export class LtilibExceptionFilter implements ExceptionFilter {
  public constructor(
    private readonly translator: TranslatorService,
    private readonly renderableExceptionFilter: RenderableExceptionFilter,
    private readonly baseExceptionFilter: BaseExceptionFilter,
  ) {}

  async catch(exception: LtilibException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();

    const error = exception.innerError;

    // handle the most specific errors before the generic ones

    if (error instanceof InvalidRedirectUriError) {
      return await this.handleInvalidRedurectUriError(error, host);
    }

    if (error instanceof MalformedRequestError) {
      return await this.handleMalformedRequestError(error, host);
    }

    if (error instanceof AuthenticationRedirectionError) {
      return response.redirect(error.intoUrl().toString());
    }

    if (error instanceof MisconfiguredPlatformError) {
      const irrecoverableError = new IrrecoverableError(error.message, error);
      const irrecoverableException = new IrrecoverableException(irrecoverableError);
      return await this.baseExceptionFilter.catch(irrecoverableException, host);
    }

    if (error instanceof CouldNotFindToolDueToExternalRepositoryError) {
      return await this.handleToolRetrievalExternalError(error, host);
    }

    if (error instanceof joseErrors.JOSENotSupported) {
      return await this.handleJoseNotSupportedError(error, host);
    }

    if (error instanceof OAuthError) {
      response.setHeaders(error.headers).status(error.httpStatusCode).send(error.present());
      return;
    }

    assert(
      error instanceof LtilibError,
      "Tried to wrap a non-ltilib error with `LtilibException`. Watch out.",
    );

    const adaptedError = new BaseErrorLtilibAdapter(error);
    const baseException = new BaseException(adaptedError, error.httpStatusCode);

    if (error instanceof LtilibError) {
      return await this.baseExceptionFilter.catch(baseException, host);
    }

    assertNever(error);
  }

  private async handleInvalidRedurectUriError(error: InvalidRedirectUriError, host: ArgumentsHost) {
    const renderable = new RenderableError(
      {
        view: "lti-invalid-redirect-uri-error",
        viewProperties: {
          title: "LTI Error",
          message: error.message,
        },
        status: error.httpStatusCode,
      },
      error.constructor.name,
    );

    return await this.renderableExceptionFilter.catch(new RenderableException(renderable), host);
  }

  private async handleMalformedRequestError(error: MalformedRequestError, host: ArgumentsHost) {
    const { message, cause } = error;
    const renderable = new RenderableError(
      {
        view: "lti/errors/malformed-launch-auth-request",
        viewProperties: {
          title: "LTI Error",
          message,
          cause,
        },
        status: error.httpStatusCode,
      },
      error.constructor.name,
    );

    return await this.renderableExceptionFilter.catch(new RenderableException(renderable), host);
  }

  private async handleJoseNotSupportedError(
    error: joseErrors.JOSENotSupported,
    host: ArgumentsHost,
  ) {
    const renderable = new RenderableError(
      {
        view: "errors/lti-server-error",
        viewProperties: {
          title: "Internal Security Error",
          message: "Could not establish a secure launch connection.",
          code: "TOKEN_SIGNATURE_FAILED",
        },
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      error.constructor.name,
    );

    return await this.renderableExceptionFilter.catch(new RenderableException(renderable), host);
  }

  private async handleToolRetrievalExternalError(
    error: CouldNotFindToolDueToExternalRepositoryError,
    host: ArgumentsHost,
  ) {
    const renderable = new RenderableError(
      {
        view: "errors/lti-server-error",
        viewProperties: {
          title: await this.translator.translate("lti:launch:tool-retrieval-ext-err:title"),
          message: await this.translator.translate("lti:launch:tool-retrieval-ext-err:message"),
          code: "COULD_NOT_RETRIEVE_TOOL_RECORD",
        },
        status: error.httpStatusCode,
      },
      error.constructor.name,
    );

    return await this.renderableExceptionFilter.catch(new RenderableException(renderable), host);
  }
}
