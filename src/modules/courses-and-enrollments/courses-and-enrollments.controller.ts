import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid.js";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { ErrorBase } from "@/core/errors/error-base.js";
import { IrrecoverableError } from "@/core/errors/irrecoverable-error.js";
import { TransactionManager } from "@/core/transaction-manager.js";
import { AssignmentPresenter } from "@/external/presenters/entities/assignment.presenter.js";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { Mvc } from "@/lib/mvc-routes.js";
import type { HttpResponse, RequestSession } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { ListAssignmentsFromCourseService } from "../assignments-and-grades/services/list-assignments-from-course.service.js";
import { SessionUser } from "../auth/session-user.js";
import { Course } from "../courses-and-enrollments/entities/course.entity.js";
import { User } from "../identity/user/user.entity.js";
import { CreateCourseContextService } from "../lti/ags/services/create-course-context.service.js";
import { CreateCourseDTO } from "./dtos/create-course.dto.js";
import { CreateCourseService } from "./services/create-course.service.js";
import { FetchManyCoursesService } from "./services/fetch-many-courses.service.js";
import { FindCourseByIdService } from "./services/find-course-by-id.service.js";

@Mvc()
@Controller("/courses")
export class CoursesAndEnrollmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly createCourseService: CreateCourseService,
    private readonly findCourseByIdService: FindCourseByIdService,
    private readonly fetchManyCoursesService: FetchManyCoursesService,
    private readonly listAssignmentsFromCourseService: ListAssignmentsFromCourseService,
    private readonly createCourseContextService: CreateCourseContextService,
    private readonly txManager: TransactionManager,
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
    const createCourseWithContext = () =>
      this.txManager.runInTransaction(() =>
        pipe(
          te.Do,
          te.bindW(
            "courseWithInstructor",
            () => () => this.createCourseService.exec({ instructorId: user.getId(), title }),
          ),
          te.chainFirstW(
            ({ courseWithInstructor }) =>
              () =>
                this.createCourseContextService.exec({ course: courseWithInstructor.getCourse() }),
          ),
          te.getOrElse((error) => {
            throw error;
          }),
        )(),
      );

    const { courseWithInstructor } = await pipe(
      te.tryCatch(createCourseWithContext, (error) => {
        if (error instanceof IrrecoverableError || error instanceof ErrorBase) {
          return error;
        }

        return new IrrecoverableError(
          `Failed to persist course and course context within a transaction (in ${CoursesAndEnrollmentsController.name}).`,
          error as Error,
        );
      }),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();

    session.flash.success = {
      message: `Curso ${courseWithInstructor.getCourse().getTitle()} criado com sucesso!`,
      seeCoursesButtonLabel: "Veja todos os cursos",
    };

    response.redirectBack();
  }

  @Get(":courseId")
  @Render("courses/details")
  public listAssignments(@Param("courseId") courseId: UUID) {
    return pipe(
      te.Do,
      te.bindW("courseAndInstructor", () => () => this.findCourseByIdService.exec({ courseId })),
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
