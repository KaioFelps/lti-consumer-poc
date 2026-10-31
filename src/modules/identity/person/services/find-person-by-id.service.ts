import { Inject, Injectable } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid.js";
import { PeopleRepository } from "../people.repository.js";

type Params = {
  id: UUID;
};

@Injectable()
export class FindPersonByIdService {
  @Inject()
  private readonly peopleRepository: PeopleRepository;

  public async exec({ id }: Params) {
    return await this.peopleRepository.findById(id.toString());
  }
}
