import {
  All,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { Client, Interaction, type InteractionResults } from "oidc-provider";
import { LoginDTO } from "@/auth/dtos/login.dto";
import { AuthenticateUserService } from "@/auth/services/authenticate-user.service";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { HttpRequest, HttpResponse } from "@/lib";
import { MVC } from "@/lib/decorators/mvc-route";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { TranslatorService } from "@/message-string/translator.service";
import { AvailableACRs } from "./consts";
import { reasonsAreValidPromptReasons, resolveAcrValues } from "./helpers";
import { OIDCProvider } from "./provider";
import { OIDCAccountsRepository } from "./repositories/accounts.repository";
import { ConsentViewManagerFactory } from "./view-manager/consent";
import { LoginViewManager } from "./view-manager/login";

@Controller("oidc")
export class OIDCController {
  @Inject()
  private provider: OIDCProvider;

  @Inject()
  private authenticateUserService: AuthenticateUserService;

  @Inject()
  private accountRepository: OIDCAccountsRepository;

  @Inject()
  private t: TranslatorService;

  /**
   * See [User flows].
   *
   * [User flows]: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#user-flows
   */
  // This `uid` param will be used by `oidc.Provider` to obtain the interaction instance.
  @MVC()
  @Get("interaction/:uid")
  @Header("cache-control", "no-store")
  public async interactions(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const interaction = await this.provider.interactionDetails(
      request,
      response,
    );
    const localeHint = interaction.params.ui_locales as string | undefined;

    const clientResult = await this.getClient(interaction);
    if (either.isLeft(clientResult)) {
      return await this.provider.interactionFinished(
        request,
        response,
        clientResult.left,
        { mergeWithLastSubmission: false },
      );
    }
    const client = clientResult.right;

    switch (interaction.prompt.name) {
      case "login": {
        const viewManager = new LoginViewManager({
          interaction,
          translatorService: this.t,
          localeHint,
        });

        return response.render(
          viewManager.getView(),
          await viewManager.getRenderData(),
        );
      }

      case "consent": {
        const accountId = interaction.session!.accountId;
        const account = await this.accountRepository.findAccountById(accountId);

        if (!account) {
          console.error(
            `Couldn't find account with id ${accountId}, even though it have been authenticated` +
              `previously. This may indicate data inconsistency.`,
          );

          return await this.provider.interactionFinished(
            request,
            response,
            { error: "invalid_request" },
            { mergeWithLastSubmission: false },
          );
        }

        const reasons = interaction.prompt.reasons;
        if (!reasonsAreValidPromptReasons(reasons)) {
          throw new IrrecoverableError(
            "Unexpected prompt reason triggered consent interaction.",
          );
        }

        // Solves one reason per time. This is allowed since oidc-provider recursively
        // redirects user back to this interaction fallback until there is no reasons left
        // to stop user from performing whatever it's trynna do.
        const reason = reasons[0];
        const viewManager = ConsentViewManagerFactory.create({
          reason,
          client,
          account,
          translatorService: this.t,
          localeHint,
          interaction,
        });

        return response.render(
          viewManager.getView(),
          await viewManager.getRenderData(),
        );
      }

      default:
        throw new IrrecoverableError(
          "Received unsupported OIDC prompt interaction.",
        );
    }
  }

  @MVC()
  @Post("interaction/:uid/login")
  @Header("cache-control", "no-store")
  public async loginIteractionFinished(
    @Req() request: Request,
    @Res() response: Response,
    @Body() login: LoginDTO,
  ) {
    const details = await this.provider.interactionDetails(request, response);

    if (details.prompt.name !== "login") {
      throw new IrrecoverableError(
        "A non-login prompt request has reached login final endpoint.",
      );
    }

    const authentication = pipe(
      await this.authenticateUserService.execute(login),
      either.mapLeft((error) => {
        if (error instanceof UnauthorizedError) return error;
        throw ExceptionsFactory.fromError(error);
      }),
    );

    if (either.isLeft(authentication)) {
      return await this.provider.interactionFinished(
        request,
        response,
        { error: "access_denied" },
        { mergeWithLastSubmission: false },
      );
    }

    const user = authentication.right;

    const acr = resolveAcrValues(details);
    // AMR values are specified in a IANA registry.
    // See: https://datatracker.ietf.org/doc/html/rfc8176
    const acrObject: Partial<InteractionResults["login"]> = acr
      ? { amr: ["pwd"], acr: AvailableACRs.loa1 }
      : {};

    const result: InteractionResults = {
      login: {
        accountId: user.getId().toString(),
        ...acrObject,
      },
    };

    await this.provider.interactionFinished(request, response, result, {
      mergeWithLastSubmission: false,
    });
  }

  @MVC()
  @Post("interaction/:uid/consent")
  @Header("cache-control", "no-store")
  public async consentIteractionFinished(
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const details = await this.provider.interactionDetails(request, response);
    const accountId = details.session?.accountId;
    const clientId = details.params.client_id as string;

    if (details.prompt.name !== "consent") {
      throw new IrrecoverableError(
        "A non-consent prompt request has reached consent final endpoint.",
      );
    }

    const grant = details.grantId
      ? await this.provider.Grant.find(details.grantId)
      : new this.provider.Grant({ accountId, clientId });

    if (!grant) {
      return await this.provider.interactionFinished(
        request,
        response,
        {
          error: "invalid_request_object",
          error_description: "request sent a non-existing grant ID",
        },
        { mergeWithLastSubmission: false },
      );
    }

    const promptDetails = details.prompt.details;

    const scopes = promptDetails.missingOIDCScope as string[] | undefined;
    if (scopes) grant.addOIDCScope(scopes.join(" "));

    const claims = promptDetails.missingOIDCClaims as string[] | undefined;
    if (claims) grant.addOIDCClaims(claims);

    const resourceScopes = promptDetails.missingResourceScopes as
      | Record<string, string[]>
      | undefined;

    if (resourceScopes) {
      for (const [indicator, scopes] of Object.entries(resourceScopes)) {
        grant.addResourceScope(indicator, scopes.join(" "));
      }
    }

    const grantId = await grant.save();
    const consent: InteractionResults["consent"] = {};
    // only pass grantId to consent if not modifying an existing grant
    if (!details.grantId) consent.grantId = grantId;

    await this.provider.interactionFinished(request, response, { consent });
  }

  @MVC()
  @Post("interaction/:uid/abort")
  public async abortInteraction(
    @Req() req: HttpRequest,
    @Res() res: HttpResponse,
  ) {
    const result = {
      error: "access_denied",
      error_description: "end-user aborted interaction",
    };

    await this.provider.interactionFinished(req, res, result, {
      mergeWithLastSubmission: false,
    });
  }

  @All("*path")
  public mountedOIDC(@Req() req: Request, @Res() res: Response) {
    req.url = req.originalUrl.replace("/oidc", "");
    return this.provider.callback()(req, res);
  }

  private async getClient(
    interaction: Interaction,
  ): Promise<Either<InteractionResults, Client>> {
    // TODO: find out whether oidc-provider does ensure client_id exists
    // before even calling this endpoint and, if this is the case,
    // remove this validation.
    const clientId = interaction.params.client_id as string | undefined;
    if (!clientId) {
      return either.left({
        error: "invalid_request",
        error_description: await this.t.translateWithHint(
          "oidc:error-descriptions:no-client-id-parameter",
          interaction.params.ui_locales as string | undefined,
        ),
      });
    }

    const client = await this.provider.Client.find(clientId);
    if (!client) {
      return either.left({
        error: "unauthorized_client",
        error_description: await this.t.translateWithHint(
          "oidc:error-descriptions:unregistered-or-unauthorized-client",
          interaction.params.ui_locales as string | undefined,
        ),
      });
    }

    return either.right(client);
  }
}
