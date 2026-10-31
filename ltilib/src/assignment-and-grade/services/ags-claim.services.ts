import { LtiLineItemsRepository } from "$/assignment-and-grade/repositories/line-items.repository.js";
import { Platform } from "$/core/platform.js";
import { CreateClaimParams, CreateService } from "./ags-claim/create-ags-claim.service.js";

export class LtiAgsClaimServices<CustomContextType = never> {
  private createService: CreateService<CustomContextType>;

  public constructor(platform: Platform, lineItemsRepo: LtiLineItemsRepository) {
    this.createService = new CreateService(platform, lineItemsRepo);
  }

  public async create(params: CreateClaimParams<CustomContextType>) {
    return await this.createService.execute(params);
  }
}
