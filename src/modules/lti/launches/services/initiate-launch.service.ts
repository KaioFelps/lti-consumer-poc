import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { User } from "@/modules/identity/user/user.entity.js";
import { findResourceLinkByIdService } from "@/modules/lti/resource-links/services/find-resource-link-by-id.service.js";
import { FindToolByIdService } from "@/modules/lti/tools/services/find-tool-by-id.service.js";
import { MessageRequests } from "$/core/messages.js";
import { LtiResourceLink } from "$/core/resource-link.js";
import { LtiLaunchServices } from "$/core/services/launch.services.js";

type Params = {
  resourceLinkId: string;
  presentation?: MessageRequests.Presentation;
  user: User;
};

@Injectable()
export class InitiateLaunchService {
  public constructor(
    private readonly launchServices: LtiLaunchServices,
    private readonly findToolByIdService: FindToolByIdService,
    private readonly findResourceLinkByIdService: findResourceLinkByIdService,
  ) {}

  public async exec({ resourceLinkId, presentation, user }: Params) {
    const sessionUserId = user.getId().toString();

    return await pipe(
      te.Do,
      te.apS("resourceLink", () => this.findResourceLinkByIdService.exec({ resourceLinkId })),
      te.bindW("tool", (args) => this.getLtilibTool(args)),
      (a) => a,
      te.chainW(({ tool, resourceLink }) => () => {
        return this.launchServices.initiateLaunch<IrrecoverableError>({
          resourceLink,
          sessionUserId,
          presentation,
          tool,
        });
      }),
    )();
  }

  private getLtilibTool({ resourceLink }: { resourceLink: LtiResourceLink }) {
    return pipe(
      () => this.findToolByIdService.exec({ id: resourceLink.toolId }),
      te.map((tool) => tool.record),
    );
  }
}
