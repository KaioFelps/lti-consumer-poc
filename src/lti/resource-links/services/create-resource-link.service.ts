import { Injectable } from "@nestjs/common";
import { generateUUID } from "common/src/types/uuid";
import { either as e } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiToolDeployment } from "@/lti/tools/entities/lti-tool-deployment.entity";
import { Context } from "$/core/context";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiResourceLinksRepository } from "../resource-links.repository";

type Params = {
  resourceLink: URL;
  context?: Context;
  deployment: LtiToolDeployment;
  title?: string;
  description?: string;
};

@Injectable()
export class CreateResourceLinkService {
  public constructor(private resourceLinksRepo: LtiResourceLinksRepository) {}

  public async exec({
    resourceLink: resource,
    context,
    deployment,
    description,
    title,
  }: Params) {
    const resourceLink = LtiResourceLink.create({
      id: generateUUID(),
      resource,
      toolId: deployment.getToolId(),
      contextId: context?.id,
      description,
      title,
      deploymentId: deployment.getId().toString(),
    });

    return pipe(
      await this.resourceLinksRepo.create(resourceLink),
      e.map(() => resourceLink),
    );
  }
}
