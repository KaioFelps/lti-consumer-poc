import { Injectable } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid.js";
import { AssignmentsRepository } from "../repositories/assignments.repository.js";

// ain't worry about filters rn
type Params = {
  courseId: UUID;
};

@Injectable()
export class ListAssignmentsFromCourseService {
  public constructor(private readonly assignmentsRepo: AssignmentsRepository) {}

  public async execute({ courseId }: Params) {
    return this.assignmentsRepo.findManyAssignmentsByCourseId(courseId);
  }
}
