import {
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
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { OIDCProvider } from "./provider";

@Controller("oidc")
export class OIDCController {
  @Inject()
  private provider: OIDCProvider;

  @Inject()
  private authenticateUserService: AuthenticateUserService;

  /**
   * See [User flows].
   *
   * [User flows]: https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#user-flows
   */
  // This `uid` param will be used by `oidc.Provider` to obtain the interaction instance.
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

    console.log(interaction, "\n\n", JSON.stringify(interaction));

    const _client = await this.provider.Client.find(
      interaction.params.client_id as string,
    );

    // TODO:
    // As we'll be dealing with a SPA, perhaps we should encode the data we will
    // need in the SPA and perform a secondary redirect to a SPA route which
    // renders the expected view using the URL-encoded data to redirect back, as
    // required by the interaction endpoint specification from `node-oidc-provider`.
    switch (interaction.prompt.name) {
      case "login":
        break;

      case "consent":
        break;

      default:
        throw new IrrecoverableError(
          "Received unsupported OIDC prompt interaction.",
        );
    }
  }

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

    const result: InteractionResults = {
      login: { accountId: user.getId().toString() },
    };

    await this.provider.interactionFinished(request, response, result, {
      mergeWithLastSubmission: false,
    });
  }

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
}
