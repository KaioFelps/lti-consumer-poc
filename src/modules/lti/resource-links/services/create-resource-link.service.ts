import { Injectable } from "@nestjs/common";
import { generateUUID } from "common/src/types/uuid.js";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { LtiToolDeployment } from "@/modules/lti/tools/entities/lti-tool-deployment.entity.js";
import { Context } from "$/core/context.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { LtiResourceLinksRepository } from "../resource-links.repository.js";

type Params = {
  resourceUrl?: URL;
  context?: Context<unknown>;
  deployment: LtiToolDeployment;
  title?: string;
  description?: string;
  customParameters?: Record<string, string>;
};

@Injectable()
export class CreateResourceLinkService {
  public constructor(private resourceLinksRepo: LtiResourceLinksRepository) {}

  public async exec({
    resourceUrl,
    context,
    deployment,
    description,
    title,
    customParameters,
  }: Params) {
    const resourceLink = LtiResourceLink.create({
      id: generateUUID(),
      resourceUrl,
      toolId: deployment.getToolId(),
      contextId: context?.id,
      description,
      title,
      deploymentId: deployment.getId().toString(),
      customParameters,
    });

    return pipe(
      await this.resourceLinksRepo.create(resourceLink),
      e.map(() => resourceLink),
    );
  }
}
