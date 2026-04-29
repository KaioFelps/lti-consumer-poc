import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { CoursesModule } from "../courses-and-enrollments/courses.module";
import { AssignmentsController } from "./assignments.controller";
import { CreateAssignmentService } from "./services/create-assignment.service";
import { GradeAnAssignmentService } from "./services/grade-an-assignment.service";

@Module({
  imports: [CoursesModule],
  providers: [CreateAssignmentService, GradeAnAssignmentService],
  controllers: [AssignmentsController],
})
export class AssignmentsAndGradesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(AssignmentsController);
  }
}
