import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid.js";
import { ExternalLtiAssignmentsRepository } from "../repositories/external-lti-assignments.repository.js";

type Params = {
  assignmentId: UUID;
};

@Injectable()
export class FindExternalLtiAssignmentByIdService {
  public constructor(private readonly ltiAssignmentsRepo: ExternalLtiAssignmentsRepository) {}

  public exec({ assignmentId }: Params) {
    return this.ltiAssignmentsRepo.findCompleteExternalLtiAssignmentById(assignmentId.toString());
  }
}
