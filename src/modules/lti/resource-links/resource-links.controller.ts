import { Body, Controller, Delete, Get, Param, Post, Query, Render } from "@nestjs/common";
import { either as e, option as o, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { InvalidArgumentError } from "@/core/errors/invalid-argument.error.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { LtiToolDeploymentPresenter } from "@/external/presenters/entities/lti-tool-deployment.presenter.js";
import { ConfigCoreValidation } from "@/lib/core-validation.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { Mvc, Rest } from "@/lib/mvc-routes.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { LtiRepositoryError } from "$/core/errors/repository.error.js";
import { Platform } from "$/core/platform.js";
import { presentLtiResourceLink } from "$/core/presenters/resource-link.presenter.js";
import { LtiResourceLinkServices } from "$/core/services/resource-link.services.js";
import { FindDeploymentByIdService } from "../deployments/services/find-deployment-by-id.service.js";
import { CreateResourceLinkDto } from "./dtos/create-resource-link.dto.js";
import type { ListResourceLinksQueryDto } from "./dtos/list-query.dto.js";
import { CreateResourceLinkService } from "./services/create-resource-link.service.js";
import { DeleteResourceLinkService } from "./services/delete-resource-link.service.js";

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
      e.map((links) => links.map((link) => presentLtiResourceLink(link, this.platform))),
      e.getOrElseW((error) => {
        throw ExceptionsFactory.fromError((error as LtiRepositoryError<IrrecoverableError>).cause);
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
      o.fromNullable(resourceLink),
      o.traverse(e.Applicative)((resourceUrl) =>
        e.tryCatch(
          () => new URL(resourceUrl),
          (_) =>
            new InvalidArgumentError({
              errorMessageIdentifier: "lti:create-resource-link:resource-link-is-valid-url",
            }),
        ),
      ),
      e.map(o.toUndefined),
      te.fromEither,
      te.chain((resourceUrl) =>
        pipe(
          () =>
            this.findDeploymentService.exec({
              deploymentId: deploymentId.toString(),
            }),
          te.map((deployment) => ({ resourceUrl, deployment })),
        ),
      ),
      te.map((params) => ({ ...params, description, title, customParameters })),
      te.chain((params) => () => this.createResourceLinkService.exec(params)),
      te.map((link) => presentLtiResourceLink(link, this.platform)),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();

    return {
      message: await this.t.translate("lti:create-resource-link:success-message", {
        linkTitle: ltiResourceLink.title,
        linkId: ltiResourceLink.id,
      }),
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
      successMessage: await this.t.translate("lti:delete-resource-link:success-message", {
        resourceLinkId,
      }),
    };
  }
}
