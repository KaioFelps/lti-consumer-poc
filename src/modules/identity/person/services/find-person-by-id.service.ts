import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { PeopleRepository } from "../people.repository";

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
