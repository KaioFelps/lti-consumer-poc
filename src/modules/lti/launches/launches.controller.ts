import { Controller, Get, HttpStatus, Param, Query, Render, Res } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { errors as joseErrors } from "jose";
import { RenderableLtiInvalidLaunchInitiationError } from "@/core/errors/renderable/lti-invalid-launch-initiation.error.js";
import { RenderableError } from "@/core/errors/renderable/renderable-error.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory.js";
import { RenderableException } from "@/lib/exceptions/renderable/exception.js";
import { Mvc } from "@/lib/mvc-routes.js";
import type { HttpResponse } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { Public } from "@/modules/auth/protected-routes.js";
import { SessionUser } from "@/modules/auth/session-user.js";
import type { User } from "@/modules/identity/user/user.entity.js";
import { Routes } from "@/routes.js";
import { InvalidLaunchInitiationError } from "$/core/errors/invalid-launch-initiation.error.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { MessageRequests } from "$/core/messages.js";
import { Platform } from "$/core/platform.js";
import { LtiLaunchServices } from "$/core/services/launch.services.js";
import { InitiateLaunchDto } from "./dtos/initiate-launch.dto.js";
import { LaunchLoginDto } from "./dtos/launch-login.dto.js";
import { PostLaunchDto } from "./dtos/post-launch.dto.js";
import { InitiateLaunchService } from "./services/initiate-launch.service.js";

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
        }),
      // passing just the method's reference (i.e., `() => launchMessage.intoForm`) causes loss of context,
      // this means the launch won't work since it will lose access to `this` (thus can't access stuff like
      // `this.platform`)
      te.matchW(
        async (error) => {
          if (error instanceof joseErrors.JOSENotSupported) {
            return handleJoseNotSupportedError(error);
          }

          throw ExtendedExceptionsFactory.fromError(error);
        },
        (response) => {
          res.setHeaders(response.headers).status(response.httpStatusCode).send(response.content);
        },
      ),
    )();
  }
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

  throw new RenderableException(renderable);
}
