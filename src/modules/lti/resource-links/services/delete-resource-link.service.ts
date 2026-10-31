import { Inject, Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid.js";
import { LtiResourceLinksRepository } from "../resource-links.repository.js";

type Params = {
  resourceLinkId: UUID;
};

@Injectable()
export class DeleteResourceLinkService {
  @Inject()
  private readonly resourceLinksRepo: LtiResourceLinksRepository;

  public async exec({ resourceLinkId }: Params) {
    return await this.resourceLinksRepo.deleteById(resourceLinkId);
  }
}
