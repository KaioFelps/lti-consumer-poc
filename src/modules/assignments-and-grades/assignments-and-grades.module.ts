import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { AssignmentsController } from "./assignments.controller";
import { CreateAssignmentService } from "./services/create-assignment.service";
import { GradeAnAssignmentService } from "./services/grade-an-assignment.service";
import { ListAssignmentsFromCourseService } from "./services/list-assignments-from-course.service";

@Module({
  providers: [CreateAssignmentService, GradeAnAssignmentService, ListAssignmentsFromCourseService],
  controllers: [AssignmentsController],
  exports: [ListAssignmentsFromCourseService],
})
export class AssignmentsAndGradesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(AssignmentsController);
  }
}
