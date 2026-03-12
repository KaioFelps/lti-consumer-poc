import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { User } from "@/modules/identity/user/user.entity";
import { findResourceLinkByIdService } from "@/modules/lti/resource-links/services/find-resource-link-by-id.service";
import { FindToolByIdService } from "@/modules/lti/tools/services/find-tool-by-id.service";
import { MessageRequests } from "$/core/messages";
import { LtiResourceLink } from "$/core/resource-link";
import { LtiLaunchServices } from "$/core/services/launch";

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
