import { Module } from "@nestjs/common";
import { AssignmentsController } from "./assignments.controller";
import { CreateAssignmentService } from "./services/create-assignment.service";
import { GradeAnAssignmentService } from "./services/grade-an-assignment.service";

@Module({
  providers: [CreateAssignmentService, GradeAnAssignmentService],
  controllers: [AssignmentsController],
})
export class AssignmentsAndGradesModule {}
