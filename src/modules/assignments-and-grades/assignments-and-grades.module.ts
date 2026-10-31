import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares.js";
import { CoursesModule } from "../courses-and-enrollments/courses.module.js";
import { AssignmentsController } from "./controllers/assignments.controller.js";
import { AssignmentsInCoursesController } from "./controllers/assignments-in-courses.controller.js";
import { CreateAssignmentService } from "./services/create-assignment.service.js";
import { FindAssignmentByIdService } from "./services/find-assignment-by-id.service.js";
import { GradeAnAssignmentService } from "./services/grade-an-assignment.service.js";
import { ListAssignmentsFromCourseService } from "./services/list-assignments-from-course.service.js";

@Module({
  imports: [forwardRef(() => CoursesModule)],
  providers: [
    CreateAssignmentService,
    GradeAnAssignmentService,
    ListAssignmentsFromCourseService,
    FindAssignmentByIdService,
  ],
  controllers: [AssignmentsInCoursesController, AssignmentsController],
  exports: [ListAssignmentsFromCourseService, CreateAssignmentService],
})
export class AssignmentsAndGradesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(...middlewares.mvc())
      .forRoutes(AssignmentsInCoursesController, AssignmentsController);
  }
}
