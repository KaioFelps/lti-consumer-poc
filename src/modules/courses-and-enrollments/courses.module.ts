import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { CoursesAndEnrollmentsController } from "./courses-and-enrollments.controller";
import { CreateCourseService } from "./services/create-course.service";
import { FetchManyCoursesService } from "./services/fetch-many-courses.service";

@Module({
  providers: [CreateCourseService, FetchManyCoursesService],
  controllers: [CoursesAndEnrollmentsController],
})
export class CoursesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(CoursesAndEnrollmentsController);
  }
}
