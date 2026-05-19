import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { ExternalLtiAssignmentsRepository } from "../repositories/external-lti-assignments.repository";

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
