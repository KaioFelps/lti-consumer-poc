import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Render,
} from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { LtiToolDeploymentPresenter } from "@/external/presenters/entities/lti-tool-deployment.presenter";
import { ConfigCoreValidation } from "@/lib/core-validation";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import { Mvc, Rest } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { Platform } from "$/core/platform";
import { presentLtiResourceLink } from "$/core/presenters/resource-link.presenter";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services";
import { FindDeploymentByIdService } from "../deployments/services/find-deployment-by-id.service";
import { CreateResourceLinkDto } from "./dtos/create-resource-link.dto";
import type { ListResourceLinksQueryDto } from "./dtos/list-query.dto";
import { CreateResourceLinkService } from "./services/create-resource-link.service";
import { DeleteResourceLinkService } from "./services/delete-resource-link.service";

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
  ) {}

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
