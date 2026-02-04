import { Inject, Injectable } from "@nestjs/common";
import { LtiToolsRepository } from "../lti-tools.repository";

@Injectable()
export class FindManyToolsPreviewsService {
  @Inject()
  private readonly toolsRepo: LtiToolsRepository;

  public async exec() {
    return await this.toolsRepo.findManyPreviews();
  }
}
