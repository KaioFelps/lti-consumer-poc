import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { AssignmentPresenter } from "@/external/presenters/entities/assignment.presenter";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter";
import type { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { ListAssignmentsFromCourseService } from "../assignments-and-grades/services/list-assignments-from-course.service";
import { SessionUser } from "../auth/session-user";
import { Course } from "../courses-and-enrollments/entities/course.entity";
import { User } from "../identity/user/user.entity";
import { CreateCourseDTO } from "./dtos/create-course.dto";
import { CreateCourseService } from "./services/create-course.service";
import { FetchManyCoursesService } from "./services/fetch-many-courses.service";
import { FindCourseByIdService } from "./services/find-course-by-id.service";

@Mvc()
@Controller("/courses")
export class CoursesAndEnrollmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly createCourseService: CreateCourseService,
    private readonly findCourseByIdService: FindCourseByIdService,
    private readonly fetchManyCoursesService: FetchManyCoursesService,
    private readonly listAssignmentsFromCourseService: ListAssignmentsFromCourseService,
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

  @Get(":courseId")
  @Render("courses/details")
  public listAssignments(@Param("courseId") courseId: UUID) {
    return pipe(
      te.Do,
      te.bindW("courseAndInstructor", () => () => this.findCourseByIdService.execute({ courseId })),
      te.bindW("course", ({ courseAndInstructor }) => te.right(courseAndInstructor.getCourse())),
      te.bindW("title", ({ course }) => te.right(course.getTitle())),
      te.bindW("assignments", ({ course }) => this.getPresentedAssignmentsFromCourse(course)),
      te.map(({ assignments, title, courseAndInstructor }) => ({
        title,
        assignments,
        course: CourseWithInstructorPresenter.present(courseAndInstructor),
      })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();
  }

  private getPresentedAssignmentsFromCourse(course: Course) {
    return pipe(
      () => this.listAssignmentsFromCourseService.execute({ courseId: course.getId() }),
      te.map((assignments) => assignments.map(AssignmentPresenter.present)),
    );
  }
}
