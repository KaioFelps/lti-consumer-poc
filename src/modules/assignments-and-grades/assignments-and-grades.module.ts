import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { CoursesModule } from "../courses-and-enrollments/courses.module";
import { AssignmentsController } from "./controllers/assignments.controller";
import { AssignmentsInCoursesController } from "./controllers/assignments-in-courses.controller";
import { CreateAssignmentService } from "./services/create-assignment.service";
import { FindAssignmentByIdService } from "./services/find-assignment-by-id.service";
import { GradeAnAssignmentService } from "./services/grade-an-assignment.service";
import { ListAssignmentsFromCourseService } from "./services/list-assignments-from-course.service";

@Module({
  imports: [forwardRef(() => CoursesModule)],
  providers: [
    CreateAssignmentService,
    GradeAnAssignmentService,
    ListAssignmentsFromCourseService,
    FindAssignmentByIdService,
  ],
  controllers: [AssignmentsInCoursesController],
  exports: [ListAssignmentsFromCourseService, CreateAssignmentService],
})
export class AssignmentsAndGradesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(...middlewares.mvc())
      .forRoutes(AssignmentsInCoursesController, AssignmentsController);
  }
}
