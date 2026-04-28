import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import middlewares from "@/lib/middlewares";
import { CoursesAndEnrollmentsController } from "../courses-and-enrollments/courses-and-enrollments.controller";
import { CreateCourseService } from "../courses-and-enrollments/services/create-course.service";

@Module({
  providers: [CreateCourseService],
  controllers: [CoursesAndEnrollmentsController],
})
export class CoursesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(...middlewares.mvc()).forRoutes(CoursesAndEnrollmentsController);
  }
}
