import { Body, Controller, Get, Post, Render, Res, Session } from "@nestjs/common";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter";
import type { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { SessionUser } from "../auth/session-user";
import { User } from "../identity/user/user.entity";
import { CreateCourseDTO } from "./dtos/create-course.dto";
import { CreateCourseService } from "./services/create-course.service";
import { FetchManyCoursesService } from "./services/fetch-many-courses.service";

@Mvc()
@Controller("/courses")
export class CoursesAndEnrollmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly createCourseService: CreateCourseService,
    private readonly fetchManyCoursesService: FetchManyCoursesService,
  ) {}

  @Get("/")
  @Render("courses/list")
  public async listCourses() {
    const title = await this.t.translate("courses:list:title");

    return await pipe(
      () => this.fetchManyCoursesService.execute(),
      te.map((courses) => courses.map(CourseWithInstructorPresenter.present)),
      te.map((courses) => ({ title, courses })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();
  }

  @Get("new")
  @Render("courses/new")
  public async createCourse() {
    return { title: await this.t.translate("courses:create:title") };
  }

  @Post("new")
  public async storeCourse(
    @Body() { title }: CreateCourseDTO,
    @Res() response: HttpResponse,
    @Session() session: RequestSession,
    @SessionUser() user: User,
  ) {
    const course = pipe(
      await this.createCourseService.execute({ instructorId: user.getId(), title }),
      e.getOrElseW((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    );

    session.flash.success = {
      message: `Curso ${course.getCourse().getTitle()} criado com sucesso!`,
      seeCoursesButtonLabel: "Veja todos os cursos",
    };

    response.redirectBack();
  }
}
