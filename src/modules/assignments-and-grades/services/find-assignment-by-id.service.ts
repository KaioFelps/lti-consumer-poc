import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid.js";
import { AssignmentsRepository } from "../repositories/assignments.repository.js";

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
