import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter";
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter";
import { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { FindCourseByIdService } from "@/modules/courses-and-enrollments/services/find-course-by-id.service";
import { mountContextId } from "../../advantage/context";
import { FindManyToolsPreviewsService } from "../../tools/services/find-many-tools-previews.service";
import { CreateExternalLtiAssignmentDto } from "../dtos/create-external-lti-assignment.dto";
import { ContextConcreteType } from "../enums/context-concrete-type";
import { CreateExternalLtiAssignmentService } from "../services/create-external-lti-assignment.service";

@Mvc()
@Controller("lti/ags/assignments")
export class LtiAssignmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly findToolsService: FindManyToolsPreviewsService,
    private readonly findCourseByIdService: FindCourseByIdService,
    private readonly createExternalLtiAssignmentService: CreateExternalLtiAssignmentService,
  ) {}

  @Get("courses/:courseId/new")
  @Render("assignments/new-lti")
  public async showCreateNewExternalAssignmentForm(@Param("courseId") courseId: UUID) {
    const title = await this.t.translate("lti:ags:create-assignment:title");
    return await pipe(
      te.Do,
      te.apS("course", () => this.findCourseByIdService.exec({ courseId })),
      te.apSW("previews", () => this.findToolsService.exec()),
      te.bindW("presentedToolsPreviews", ({ previews }) =>
        te.right(previews.map(LtiToolPreviewPresenter.present)),
      ),
      te.bindW("presentedCourse", ({ course }) =>
        te.right(CourseWithInstructorPresenter.present(course)),
      ),
      te.map(({ presentedCourse, presentedToolsPreviews }) => ({
        title,
        registeredTools: presentedToolsPreviews,
        course: presentedCourse,
      })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();
  }

  @Post("courses/:courseId/new")
  public async storeNewExternalAssignment(
    @Body() body: CreateExternalLtiAssignmentDto,
    @Param("courseId") courseId: UUID,
    @Session() session: RequestSession,
    @Res() response: HttpResponse,
  ) {
    const { assignment } = await pipe(
      () => this.findCourseByIdService.exec({ courseId }),
      te.chainW(
        (course) => () =>
          this.createExternalLtiAssignmentService.exec({
            assignment: { ...body.assignment, courseId },
            resourceLink: {
              resourceUrl: new URL(body.resourceLink.resourceUrl),
              customParameters: body.resourceLink.customParameters,
            },
            toolId: body.toolId,
            contextComposedId: mountContextId(
              course.getCourse().getId().toString(),
              ContextConcreteType.Course,
            ),
            instructorId: course.getInstructor().getId(),
          }),
      ),
      (a) => a,
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
