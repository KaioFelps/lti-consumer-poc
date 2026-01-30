import { Injectable } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error";
import { User } from "@/identity/user/user.entity";
import { eitherPromiseToTaskEither as teFromPromise } from "@/lib/fp-ts";
import { findResourceLinkByIdService } from "@/lti/resource-links/services/find-resource-link-by-id.service";
import { FindToolByIdService } from "@/lti/tools/services/find-tool-by-id.service";
import { LtiLaunchServices } from "$/core/services/launch.services";

type Params = {
  resourceLinkId: string;
  user: User;
};

@Injectable()
export class InitiateLaunchService {
  public constructor(
    private readonly launchServices: LtiLaunchServices,
    private readonly findToolByIdService: FindToolByIdService,
    private readonly findResourceLinkByIdService: findResourceLinkByIdService,
  ) {}

  public async exec({ resourceLinkId, user }: Params) {
    return await pipe(
      teFromPromise(() =>
        this.findResourceLinkByIdService.exec({ resourceLinkId }),
      ),
      te.chainW((resourceLink) =>
        pipe(
          teFromPromise(() =>
            this.findToolByIdService.exec({ id: resourceLink.toolId }),
          ),
          te.map((tool) => ({ tool: tool.record, resourceLink })),
        ),
      ),
      te.chainW(({ tool, resourceLink }) =>
        teFromPromise(() =>
          this.launchServices.prepareLaunchInitiationRequest<IrrecoverableError>(
            {
              resourceLink,
              tool,
              sessionUserId: user.getId().toString(),
            },
          ),
        ),
      ),
    )();
  }
}
