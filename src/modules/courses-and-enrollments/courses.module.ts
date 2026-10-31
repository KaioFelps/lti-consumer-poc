import { forwardRef, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares.js";
import { AssignmentsAndGradesModule } from "../assignments-and-grades/assignments-and-grades.module.js";
import { LtiModule } from "../lti/lti.module.js";
import { CoursesAndEnrollmentsController } from "./courses-and-enrollments.controller.js";
import { CreateCourseService } from "./services/create-course.service.js";
import { FetchManyCoursesService } from "./services/fetch-many-courses.service.js";
import { FindCourseByIdService } from "./services/find-course-by-id.service.js";

@Module({
  imports: [forwardRef(() => AssignmentsAndGradesModule), forwardRef(() => LtiModule)],
  providers: [CreateCourseService, FetchManyCoursesService, FindCourseByIdService],
  controllers: [CoursesAndEnrollmentsController],
  exports: [FindCourseByIdService],
})
export class CoursesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(CoursesAndEnrollmentsController);
  }
}
