import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { AssignmentsRepository } from "../repositories/assignments.repository";

type Params = {
  assignmentId: UUID;
};

@Injectable()
export class FindAssignmentByIdService {
  public constructor(private readonly assignmentsRepo: AssignmentsRepository) {}

  public exec({ assignmentId }: Params) {
    return this.assignmentsRepo.findById(assignmentId);
  }
}
