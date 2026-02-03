import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  Render,
  Res,
} from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { type JOSENotSupported } from "jose/dist/types/util/errors";
import { Public } from "@/auth/public-routes";
import { SessionUser } from "@/auth/session-user";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { PersonNotFoundError } from "@/identity/errors/person-not-found.error";
import type { User } from "@/identity/user/user.entity";
import { HttpResponse } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { Routes } from "@/routes";
import { assertNever } from "@/utils/assert-never";
import type { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";
import { RedirectionError } from "$/core/errors/redirection.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { MessageRequests } from "$/core/messages";
import { Platform } from "$/core/platform";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { FindToolByIdService } from "../tools/services/find-tool-by-id.service";
import { InitiateLaunchDto } from "./dtos/initiate-launch.dto";
import { LaunchLoginDto } from "./dtos/launch-login.dto";
import { PostLaunchDto } from "./dtos/post-launch.dto";
import { InitiateLaunchService } from "./services/initiate-launch.service";
import { LaunchLoginService } from "./services/launch-login.service";

type IErrorContext<E> = E extends InvalidRedirectUriError
  ? { error: E }
  : {
      error: E;
      redirectUri: URL;
    };

@Mvc()
@Controller("/lti/launches")
export class LtiLaunchesController {
  public constructor(
    private launchServices: LtiLaunchServices,
    private launchLoginService: LaunchLoginService,
    private initiateLaunchService: InitiateLaunchService,
    private findToolByIdService: FindToolByIdService,
    private platform: Platform,
    private t: TranslatorService,
  ) {}

  @Render("post-launch")
  @Get("post-launch")
  public async postLaunch(
    @Query() { errorLog, errorMsg, successLog, successMsg }: PostLaunchDto,
  ) {
    let title: string;
    if (successMsg || successLog)
      title = await this.t.translate("lti:post-launch:success-title");
    else if (errorMsg || errorLog)
      title = await this.t.translate("lti:post-launch:error-title");
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
    return pipe(
      await this.initiateLaunchService.exec({
        resourceLinkId,
        user,
        presentation: MessageRequests.Presentation.create({
          documentTarget: MessageRequests.DocumentTarget.Window,
          width,
          height,
          locale: this.t.getLocale(),
          returnUrl: new URL(Routes.lti.launch.return(), this.platform.issuer),
        }),
      }),
      e.match(
        (_error) => {
          const error =
            _error instanceof LtiRepositoryError ? _error.cause : _error;

          throw ExceptionsFactory.fromError(error);
        },
        (initiateLaunchRequest) =>
          response.redirect(initiateLaunchRequest.intoUrl().toString()),
      ),
    );
  }

  @Public()
  @Get("login")
  public async launchLogin(
    @Query() body: LaunchLoginDto,
    @Res() res: HttpResponse,
    @SessionUser() user?: User,
  ): Promise<HttpResponse | void> {
    return await pipe(
      () => this.findToolByIdService.exec({ id: body.client_id }),
      te.map((tool) => tool.record),
      te.chainW((tool) =>
        pipe(
          () =>
            this.launchServices.verifyRedirectUri({
              tool,
              redirectUri: body.redirect_uri,
            }),
          te.map((redirectUri) => ({ redirectUri, tool })),
        ),
      ),
      te.mapLeft((error) => ({ error }) as IErrorContext<typeof error>),
      te.chainW(({ redirectUri, tool }) =>
        pipe(
          () => this.launchLoginService.exec({ body, redirectUri, tool, user }),
          te.mapLeft(
            (error) => ({ error, redirectUri }) as IErrorContext<typeof error>,
          ),
        ),
      ),
      te.mapLeft((e) => e),
      te.match(
        (errorContext) => {
          const isInvalidRedirectUriError = !("redirectUri" in errorContext);
          if (isInvalidRedirectUriError)
            return handleInvalidRedurectUriError(errorContext.error);

          const { error, redirectUri } = errorContext;

          if (error instanceof MalformedRequestError)
            return handleMalformedRequestError(error);

          if (error instanceof RedirectionError) {
            return res.redirect(error.intoUrl().toString());
          }

          const isLtiRepositoryExternalError =
            error instanceof LtiRepositoryError &&
            error.type === "ExternalError";

          if (isLtiRepositoryExternalError) {
            const { cause } = error;
            return handleIrrecoverableError(cause, body, redirectUri, res);
          }

          if (error instanceof IrrecoverableError)
            return handleIrrecoverableError(error, body, redirectUri, res);

          if (error instanceof PersonNotFoundError)
            return handlePersonNotFoundError(error, body, redirectUri, res);

          assertNever(error);
        },
        (link) =>
          pipe(
            () => link.intoForm(),
            te.match(
              (error) => handleJoseNotSupportedError(error),
              (form) => res.type("html").status(HttpStatus.OK).send(form),
            ),
          )(),
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
      status: HttpStatus.BAD_REQUEST,
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
      status: HttpStatus.BAD_REQUEST,
    },
    error.constructor.name,
  );

  throw ExceptionsFactory.fromError(renderable);
}

function handleIrrecoverableError(
  _error: IrrecoverableError,
  body: LaunchLoginDto,
  redirectUri: URL,
  response: HttpResponse,
) {
  const redirectionError = new RedirectionError({
    code: "server_error",
    description: "Something went wrong in the server. Try again later.",
    redirectUri,
    state: body.state,
  });

  return response.redirect(redirectionError.intoUrl().toString());
}

function handlePersonNotFoundError(
  _error: PersonNotFoundError,
  body: LaunchLoginDto,
  redirectUri: URL,
  response: HttpResponse,
) {
  const redirectionError = new RedirectionError({
    code: "login_required",
    description: "User could not be found.",
    redirectUri,
    state: body.state,
  });

  return response.redirect(redirectionError.intoUrl().toString());
}

function handleJoseNotSupportedError(error: JOSENotSupported) {
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
