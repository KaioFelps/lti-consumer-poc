import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { LtiResourceLinksRepository } from "../resource-links.repository";

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
