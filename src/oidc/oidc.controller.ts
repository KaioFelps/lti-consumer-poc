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
import { pipe } from "fp-ts/lib/function";
import { type InteractionResults } from "oidc-provider";
import { LoginDTO } from "@/auth/dtos/login.dto";
import { AuthenticateUserService } from "@/auth/services/authenticate-user.service";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { UnauthorizedError } from "@/core/errors/unauthorized.error";
import { MVC } from "@/lib/decorators/mvc-route";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { TranslatorService } from "@/message-string/translator.service";
import { AvailableACRs } from "./consts";
import { resolveAcrValues } from "./helpers";
import { OIDCProvider } from "./provider";

@Controller("oidc")
export class OIDCController {
  @Inject()
  private provider: OIDCProvider;

  @Inject()
  private authenticateUserService: AuthenticateUserService;

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

    const _client = await this.provider.Client.find(
      interaction.params.client_id as string,
    );

    switch (interaction.prompt.name) {
      case "login":
        return response.render("login", {
          endpoint: `/oidc/interaction/${interaction.uid}/login`,
          registerEndpoint: "/auth/register",
          title: await this.t.translate("oidc:login:title"),
          locale: this.t.getLocale(),
          labels: {
            username: await this.t.translate(
              "auth:forms:login:labels:username",
            ),
            password: await this.t.translate(
              "auth:forms:login:labels:password",
            ),
          },
          buttons: {
            login: await this.t.translate("auth:forms:login:buttons:login"),
            noAccount: await this.t.translate(
              "auth:forms:login:buttons:no-account",
            ),
          },
        });

      case "consent":
        return response.render("confirm", {});

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

    console.debug("login");

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

    if (details.prompt.name !== "consent") {
      throw new IrrecoverableError(
        "A non-consent prompt request has reached consent final endpoint.",
      );
    }

    // const grantId = details.grantId;
  }

  @All("/*path")
  public mountedOIDC(@Req() req: Request, @Res() res: Response) {
    req.url = req.originalUrl.replace("/oidc", "");
    return this.provider.callback()(req, res);
  }
}
