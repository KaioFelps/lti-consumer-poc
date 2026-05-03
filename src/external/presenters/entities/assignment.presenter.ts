import { Assignment } from "@/modules/assignments-and-grades/entities/assignment.entity";

type PresentedAssignment = {
  id: string;
  title: string;
  maxScore: number;
  releasedAt?: Date;
  deadline?: Date;
  createdAt: Date;
};

export class AssignmentPresenter {
  public static present(entity: Assignment): PresentedAssignment {
    return {
      id: entity.getId().toString(),
      title: entity.getTitle(),
      maxScore: entity.getMaxScore(),
      releasedAt: entity.getReleasedAt(),
      deadline: entity.getDeadline(),
      createdAt: entity.getCreatedAt(),
    };
  }
}
