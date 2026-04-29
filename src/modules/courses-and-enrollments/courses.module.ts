import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { CoursesAndEnrollmentsController } from "./courses-and-enrollments.controller";
import { CreateCourseService } from "./services/create-course.service";
import { FetchManyCoursesService } from "./services/fetch-many-courses.service";
import { FindCourseByIdService } from "./services/find-course-by-id.service";

@Module({
  providers: [CreateCourseService, FetchManyCoursesService, FindCourseByIdService],
  controllers: [CoursesAndEnrollmentsController],
  exports: [FindCourseByIdService],
})
export class CoursesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(CoursesAndEnrollmentsController);
  }
}
