import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import { type UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter";
import { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { SessionUser } from "../auth/session-user";
import { FindCourseByIdService } from "../courses-and-enrollments/services/find-course-by-id.service";
import { User } from "../identity/user/user.entity";
import { CreateAssignmentDTO } from "./dtos/create-assignment.dto";
import { CreateAssignmentService } from "./services/create-assignment.service";

@Mvc()
@Controller("/courses/:courseId/assignments")
export class AssignmentsController {
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
      () => this.findCourseByIdService.execute({ courseId }),
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
