import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository";
import { Platform } from "$/core/platform";
import { CreateClaimParams, CreateService } from "./create-ags-claim.service";

export class LtiAgsClaimServices<CustomContextType = never> {
  private createService: CreateService<CustomContextType>;

  public constructor(platform: Platform, lineItemsRepo: LtiLineItemsRepository) {
    this.createService = new CreateService(platform, lineItemsRepo);
  }

  public async create(params: CreateClaimParams<CustomContextType>) {
    return await this.createService.execute(params);
  }
}
