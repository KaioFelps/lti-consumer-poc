import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid.js";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter.js";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory.js";
import { Mvc } from "@/lib/mvc-routes.js";
import type { HttpResponse, RequestSession } from "@/lib.js";
import { TranslatorService } from "@/message-string/translator.service.js";
import { SessionUser } from "../../auth/session-user.js";
import { FindCourseByIdService } from "../../courses-and-enrollments/services/find-course-by-id.service.js";
import { User } from "../../identity/user/user.entity.js";
import { CreateAssignmentDTO } from "../dtos/create-assignment.dto.js";
import { CreateAssignmentService } from "../services/create-assignment.service.js";

@Mvc()
@Controller("/courses/:courseId/assignments")
export class AssignmentsInCoursesController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly createAssignmentService: CreateAssignmentService,
    private readonly findCourseByIdService: FindCourseByIdService,
  ) {}

  @Get("create")
  @Render("assignments/new")
  public async showCreateAssignmentForm(@Param("courseId") courseId: UUID) {
    const title = await this.t.translate("assignments:create-assignment:title");

    return await pipe(
      () => this.findCourseByIdService.exec({ courseId }),
      te.map(CourseWithInstructorPresenter.present),
      te.map((course) => ({ course, title })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();
  }

  @Post("create")
  public async createAssignment(
    @Param("courseId") courseId: UUID,
    @SessionUser() user: User,
    @Body() dto: CreateAssignmentDTO,
    @Res() response: HttpResponse,
    @Session() session: RequestSession,
  ) {
    const assignment = await pipe(
      () =>
        this.createAssignmentService.execute({
          courseId,
          instructorId: user.getId(),
          maxScore: dto.maxScore,
          title: dto.title,
          deadline: dto.deadline,
          releasedAt: dto.releasedAt,
        }),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();

    session.flash.success = {
      message: await this.t.translate("assignments:create-assignment:success-message", {
        assignmentTitle: assignment.getTitle(),
      }),
      assignmentId: assignment.getId(),
    };

    response.redirectBack();
  }
}
