import { Controller, Get, HttpStatus, Param, Query, Render, Res } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { errors as joseErrors } from "jose";
import { RenderableLtiInvalidLaunchInitiationError } from "@/core/errors/renderable/lti-invalid-launch-initiation.error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { HttpResponse } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { Public } from "@/modules/auth/public-routes";
import { SessionUser } from "@/modules/auth/session-user";
import type { User } from "@/modules/identity/user/user.entity";
import { Routes } from "@/routes";
import { assertNever } from "@/utils/assert-never";
import { AuthenticationRedirectionError } from "$/core/errors/authentication-redirection.error";
import { OAuthError } from "$/core/errors/bases/oauth.error";
import { CouldNotFindToolDueToExternalRepositoryError } from "$/core/errors/could-not-find-tool-due-to-external-error";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { MessageRequests } from "$/core/messages";
import { Platform } from "$/core/platform";
import { LtiLaunchServices } from "$/core/services/launch";
import { InitiateLaunchDto } from "./dtos/initiate-launch.dto";
import { LaunchLoginDto } from "./dtos/launch-login.dto";
import { PostLaunchDto } from "./dtos/post-launch.dto";
import { InitiateLaunchService } from "./services/initiate-launch.service";

@Mvc()
@Controller("/lti/launches")
export class LtiLaunchesController {
  public constructor(
    private launchServices: LtiLaunchServices,
    private initiateLaunchService: InitiateLaunchService,
    private platform: Platform,
    private t: TranslatorService,
  ) {}

  @Render("post-launch")
  @Get("post-launch")
  public async postLaunch(@Query() { errorLog, errorMsg, successLog, successMsg }: PostLaunchDto) {
    let title: string;
    if (successMsg || successLog) title = await this.t.translate("lti:post-launch:success-title");
    else if (errorMsg || errorLog) title = await this.t.translate("lti:post-launch:error-title");
    else title = await this.t.translate("lti:post-launch:default-title");

    if (errorLog) console.error(errorLog);
    else if (successLog) console.info(successLog);

    return {
      title,
      successMsg,
      errorMsg,
    };
  }

  @Get(":id/initiate")
  public async initiateLaunch(
    @Param("id") resourceLinkId: string,
    @Query() { width, height }: InitiateLaunchDto,
    @SessionUser() user: User,
    @Res() response: HttpResponse,
  ) {
    const presentation = MessageRequests.Presentation.create({
      documentTarget: MessageRequests.DocumentTarget.Window,
      width,
      height,
      locale: this.t.getLocale(),
      returnUrl: new URL(Routes.lti.launch.return(), this.platform.issuer),
    });

    return pipe(
      () => this.initiateLaunchService.exec({ resourceLinkId, user, presentation }),
      te.match(
        async (_error) => {
          if (_error instanceof InvalidLaunchInitiationError) {
            const error = await RenderableLtiInvalidLaunchInitiationError.create(_error, this.t);
            throw ExceptionsFactory.fromError(error);
          }

          const error = _error instanceof LtiRepositoryError ? _error.cause : _error;
          throw ExceptionsFactory.fromError(error);
        },
        async (initiateLaunchRequest) =>
          response.redirect(initiateLaunchRequest.intoUrl().toString()),
      ),
    )();
  }

  @Public()
  @Get("login")
  public async launchLogin(
    @Query() body: LaunchLoginDto,
    @Res() res: HttpResponse,
  ): Promise<HttpResponse | void> {
    return await pipe(
      () =>
        this.launchServices.authenticateLaunch({
          ...body,
          toolId: body.client_id,
          redirectUri: body.redirect_uri,
          loginHint: body.login_hint,
          messageHint: body.lti_message_hint,
          fallbackUserRoles: undefined,
          errorDescriptionsRoutes: undefined,
          context: undefined,
        }),
      // passing just the method's reference (i.e., `() => launchMessage.intoForm`) causes loss of context,
      // this means the launch won't work since it will lose access to `this` (thus can't access stuff like
      // `this.platform`)
      te.chainW((launchMessage) => () => launchMessage.intoForm()),
      te.matchW(
        async (error) => {
          if (error instanceof InvalidRedirectUriError) return handleInvalidRedurectUriError(error);

          if (error instanceof MalformedRequestError) return handleMalformedRequestError(error);

          if (error instanceof AuthenticationRedirectionError) {
            return res.redirect(error.intoUrl().toString());
          }

          if (error instanceof OAuthError) return handleOAuthLikeError(error, res);

          if (error instanceof CouldNotFindToolDueToExternalRepositoryError) {
            return await handleToolRetrievalExternalError(error, this.t);
          }

          if (error instanceof joseErrors.JOSENotSupported)
            return handleJoseNotSupportedError(error);

          assertNever(error);
        },
        (form) => res.type("html").status(HttpStatus.OK).send(form),
      ),
    )();
  }
}

function handleInvalidRedurectUriError(error: InvalidRedirectUriError) {
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

  throw ExceptionsFactory.fromError(renderable);
}

function handleMalformedRequestError(error: MalformedRequestError) {
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

  throw ExceptionsFactory.fromError(renderable);
}

function handleJoseNotSupportedError(error: joseErrors.JOSENotSupported) {
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

  throw ExceptionsFactory.fromError(renderable);
}

function handleOAuthLikeError<T extends string>(error: OAuthError<T>, res: HttpResponse) {
  Object.entries(error.headers).forEach(([header, value]) => res.setHeader(header, value));
  res.status(error.httpStatusCode).send(error.present());
}

async function handleToolRetrievalExternalError(
  error: CouldNotFindToolDueToExternalRepositoryError,
  t: TranslatorService,
) {
  const renderable = new RenderableError(
    {
      view: "errors/lti-server-error",
      viewProperties: {
        title: await t.translate("lti:launch:tool-retrieval-ext-err:title"),
        message: await t.translate("lti:launch:tool-retrieval-ext-err:message"),
        code: "COULD_NOT_RETRIEVE_TOOL_RECORD",
      },
      status: error.httpStatusCode,
    },
    error.constructor.name,
  );

  throw ExceptionsFactory.fromError(renderable);
}
