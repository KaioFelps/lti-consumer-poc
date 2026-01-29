import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Render,
  Res,
} from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Public } from "@/auth/public-routes";
import { SessionUser } from "@/auth/session-user";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { RenderableError } from "@/core/errors/renderable/renderable-error";
import { LtiToolDeploymentPresenter } from "@/external/presenters/entities/lti-tool-deployment.presenter";
import { PersonNotFoundError } from "@/identity/errors/person-not-found.error";
import { User } from "@/identity/user/user.entity";
import { HttpResponse } from "@/lib";
import { ConfigCoreValidation } from "@/lib/core-validation";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import { Mvc, Rest } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { assertNever } from "@/utils/assert-never";
import { InvalidRedirectUriError } from "$/core/errors/invalid-redirect-uri.error";
import { MalformedRequestError } from "$/core/errors/malformed-request.error";
import { RedirectionError } from "$/core/errors/redirection.error";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { Platform } from "$/core/platform";
import { presentLtiResourceLink } from "$/core/presenters/resource-link.presenter";
import { LtiLaunchServices } from "$/core/services/launch.services";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services";
import { FindDeploymentByIdService } from "../deployments/services/find-deployment-by-id.service";
import { FindToolByIdService } from "../tools/services/find-tool-by-id.service";
import { CreateResourceLinkDto } from "./dtos/create-resource-link.dto";
import { LaunchLoginDto } from "./dtos/launch-login.dto";
import { ListResourceLinksQueryDto } from "./dtos/list-query.dto";
import { CreateResourceLinkService } from "./services/create-resource-link.service";
import { DeleteResourceLinkService } from "./services/delete-resource-link.service";
import { LaunchLoginService } from "./services/launch-login.service";

type IErrorContext<E> = E extends InvalidRedirectUriError
  ? { error: E }
  : {
      error: E;
      redirectUri: URL;
    };

@Mvc()
@Controller("/lti/resource-links")
export class LtiResourceLinksController {
  public constructor(
    private t: TranslatorService,
    private platform: Platform,
    private resourceLinkServices: LtiResourceLinkServices,
    private findDeploymentService: FindDeploymentByIdService,
    private createResourceLinkService: CreateResourceLinkService,
    private deleteResourceLinkService: DeleteResourceLinkService,
    private launchServices: LtiLaunchServices,
    private launchLoginService: LaunchLoginService,
    private findToolByIdService: FindToolByIdService,
  ) {}

  @Get(":id/initiate")
  public async initiateLaunch() {}

  @Public()
  @Post("launch-login")
  public async launchLogin(
    @Body() body: LaunchLoginDto,
    @Res() res: HttpResponse,
    @SessionUser() user?: User,
  ): Promise<HttpResponse | void> {
    return await pipe(
      teFromPromise(() =>
        this.findToolByIdService.exec({ id: body.client_id }),
      ),
      te.map((tool) => tool.record),
      te.chainW((tool) =>
        pipe(
          teFromPromise(() =>
            this.launchServices.verifyRedirectUri({
              tool,
              redirectUri: body.redirect_uri,
            }),
          ),
          te.map((redirectUri) => ({ redirectUri, tool })),
        ),
      ),
      te.mapLeft((error) => ({ error }) as IErrorContext<typeof error>),
      te.chainW(({ redirectUri, tool }) =>
        pipe(
          teFromPromise(() =>
            this.launchLoginService.exec({ body, redirectUri, tool, user }),
          ),
          te.mapLeft(
            (error) => ({ error, redirectUri }) as IErrorContext<typeof error>,
          ),
        ),
      ),
      te.mapLeft((e) => e),
      te.matchW(
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
        (link) => res.send(link.intoForm()).type("html").status(HttpStatus.OK),
      ),
    )();
  }

  @Get()
  @Render("deployment-resource-links")
  @ConfigCoreValidation({ renderErrorsWithView: "dto-validation-error" })
  public async showResourceLinksFromDeployment(
    @Query() { deploymentId }: ListResourceLinksQueryDto,
  ) {
    const resourceLinks = pipe(
      await this.resourceLinkServices.getResourceLinksFromDeployment({
        deploymentId,
      }),
      e.map((links) =>
        links.map((link) => presentLtiResourceLink(link, this.platform)),
      ),
      e.getOrElseW((error: LtiRepositoryError<IrrecoverableError>) => {
        throw ExceptionsFactory.fromError(error.cause);
      }),
    );

    const deployment = pipe(
      await this.findDeploymentService.exec({ deploymentId }),
      e.map(LtiToolDeploymentPresenter.present),
      e.getOrElseW((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    );

    return {
      title: await this.t.translate("lti:list-resource-links:title", {
        deploymentLabel: deployment.label,
      }),
      deployment,
      resourceLinks,
    };
  }

  @Rest()
  @Post("create")
  public async create(
    @Body() {
      deploymentId,
      resourceLink,
      description,
      title,
      customParameters,
    }: CreateResourceLinkDto,
  ) {
    const ltiResourceLink = await pipe(
      e.tryCatch(
        () => new URL(resourceLink),
        (_) =>
          new InvalidArgumentError({
            errorMessageIdentifier:
              "lti:create-resource-link:resource-link-is-valid-url",
          }),
      ),
      te.fromEither,
      te.chain((resourceLink) =>
        pipe(
          teFromPromise(() =>
            this.findDeploymentService.exec({
              deploymentId: deploymentId.toString(),
            }),
          ),
          te.map((deployment) => ({ resourceLink, deployment })),
        ),
      ),
      te.map((params) => ({ ...params, description, title, customParameters })),
      te.chain((params) =>
        teFromPromise(() => this.createResourceLinkService.exec(params)),
      ),
      te.map((link) => presentLtiResourceLink(link, this.platform)),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();

    return {
      message: await this.t.translate(
        "lti:create-resource-link:success-message",
        { linkTitle: ltiResourceLink.title, linkId: ltiResourceLink.id },
      ),
      ltiResourceLink,
    };
  }

  @Rest()
  @Delete(":id")
  public async delete(@Param("id") resourceLinkId: string) {
    const result = await this.deleteResourceLinkService.exec({
      resourceLinkId,
    });

    if (e.isLeft(result)) throw ExceptionsFactory.fromError(result.left);

    return {
      resourceLinkId,
      successMessage: await this.t.translate(
        "lti:delete-resource-link:success-message",
        { resourceLinkId },
      ),
    };
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
