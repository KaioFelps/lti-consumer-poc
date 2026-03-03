import { LtiLineItemsRepository } from "../../repositories/line-items.repository";

export type DiscoverLineItemServiceParams = {
  resourceId: string;
  tag?: string;
};

export class DiscoverService {
  public constructor(private readonly lineItemsRepo: LtiLineItemsRepository) {}

  public async execute({ resourceId, tag }: DiscoverLineItemServiceParams) {
    return await this.lineItemsRepo.findByExternalResourceAndTag(resourceId, tag);
  }
}
