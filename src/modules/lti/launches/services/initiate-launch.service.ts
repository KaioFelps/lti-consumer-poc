import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { User } from "@/modules/identity/user/user.entity";
import { findResourceLinkByIdService } from "@/modules/lti/resource-links/services/find-resource-link-by-id.service";
import { FindToolByIdService } from "@/modules/lti/tools/services/find-tool-by-id.service";
import { MessageRequests } from "$/core/messages";
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
    return await pipe(
      () => this.findResourceLinkByIdService.exec({ resourceLinkId }),
      te.chainW((resourceLink) =>
        pipe(
          () => this.findToolByIdService.exec({ id: resourceLink.toolId }),
          te.map((tool) => ({ tool: tool.record, resourceLink })),
        ),
      ),
      te.chainW(
        ({ tool, resourceLink }) =>
          () =>
            this.launchServices.initiateLaunch<IrrecoverableError>({
              resourceLink,
              tool,
              sessionUserId: user.getId().toString(),
              presentation,
            }),
      ),
    )();
  }
}
