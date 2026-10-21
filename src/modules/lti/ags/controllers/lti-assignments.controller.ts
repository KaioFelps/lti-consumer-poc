import { Body, Controller, Get, Param, Post, Render, Res, Session } from "@nestjs/common";
import type { UUID } from "common/src/types/uuid";
import { either as e, taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { AssignmentPresenter } from "@/external/presenters/entities/assignment.presenter";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter";
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter";
import { HttpResponse, RequestSession } from "@/lib";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { CourseInstructorMismatch } from "@/modules/assignments-and-grades/errors/course-instructor-mismatch.error";
import { CourseNotFoundError } from "@/modules/assignments-and-grades/errors/course-not-found.error";
import { SessionUser } from "@/modules/auth/session-user";
import { FindCourseByIdService } from "@/modules/courses-and-enrollments/services/find-course-by-id.service";
import { User } from "@/modules/identity/user/user.entity";
import { LtiRepositoryError } from "$/core/errors/repository.error";
import { Platform } from "$/core/platform";
import { presentLtiResourceLink } from "$/core/presenters/resource-link.presenter";
import { ShowAssignmentsDetailsDto } from "../../../assignments-and-grades/dtos/show-assignments-details-params.dto";
import { mountContextId } from "../../advantage/context";
import { FindManyToolsPreviewsService } from "../../tools/services/find-many-tools-previews.service";
import { ChooseMainLineItemDto } from "../dtos/choose-main-line-item.dto";
import { CreateExternalLtiAssignmentDto } from "../dtos/create-external-lti-assignment.dto";
import { ContextConcreteType } from "../enums/context-concrete-type";
import { ChooseMainLineItemService } from "../services/choose-main-line-item.service";
import { CreateExternalLtiAssignmentService } from "../services/create-external-lti-assignment.service";
import {
  AssignmentGradingDetails,
  FindAssignmentGradingDetailsService,
} from "../services/find-assignment-grading-details.service";
import { FindExternalLtiAssignmentByIdService } from "../services/find-external-lti-assignment-by-id.service";
import { FindStudentScoreDetailsByExternalAssignmentIdService } from "../services/find-student-score-details-by-assignment-id.service";

@Mvc()
@Controller("lti/ags")
export class LtiAssignmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly platform: Platform,
    private readonly findToolsService: FindManyToolsPreviewsService,
    private readonly findCourseByIdService: FindCourseByIdService,
    private readonly createExternalLtiAssignmentService: CreateExternalLtiAssignmentService,
    private readonly findExternalLtiAssignmentService: FindExternalLtiAssignmentByIdService,
    private readonly findScoreDetailsService: FindStudentScoreDetailsByExternalAssignmentIdService,
    private readonly findGradingDetailsService: FindAssignmentGradingDetailsService,
    private readonly chooseMainLineItemService: ChooseMainLineItemService,
  ) {}

  @Get("courses/:courseId/assignments/new")
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

  @Post("courses/:courseId/assignments/new")
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
      te.getOrElse((error) => {
        throw ExtendedExceptionsFactory.fromError(error);
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

  @Render("lti/assignments/details")
  @Get("/assignments/:assignmentId")
  public showAssignmentDetails(
    @SessionUser() user: User,
    @Param() { assignmentId }: ShowAssignmentsDetailsDto,
  ) {
    return pipe(
      te.Do,
      te.apS("externalAssignmentRecord", () =>
        this.findExternalLtiAssignmentService.exec({ assignmentId }),
      ),
      te.bindW("course", ({ externalAssignmentRecord }) => {
        const courseId = externalAssignmentRecord.assignment.getCourseId();
        return courseId ? () => this.findCourseByIdService.exec({ courseId }) : te.right(undefined);
      }),
      te.bindW(
        "studentAssignmentsDetails",
        ({ externalAssignmentRecord }) =>
          () =>
            this.findScoreDetailsService.exec({
              assignmentId: externalAssignmentRecord.assignment.getId(),
              courseId: externalAssignmentRecord.assignment.getCourseId()!,
              studentUser: user,
            }),
      ),
      // the grading matrix is exclusive to the course's instructor
      te.bindW("gradingDetails", ({ externalAssignmentRecord, course }) => {
        const courseId = externalAssignmentRecord.assignment.getCourseId();
        if (!course || !courseId || course.getInstructor().getId() !== user.getId()) {
          return te.right(null);
        }

        return pipe(
          () =>
            this.findGradingDetailsService.exec({
              assignmentId: externalAssignmentRecord.assignment.getId(),
              courseId,
            }),
          te.map(presentGradingDetails),
        );
      }),
      te.chainTaskK(
        ({ course, externalAssignmentRecord, studentAssignmentsDetails, gradingDetails }) =>
          async () => ({
            title: await this.t.translate("assignments:details:title", {
              courseTitle: course?.getCourse().getTitle(),
              assignmentTitle: externalAssignmentRecord.assignment.getTitle(),
            }),
            course: course ? CourseWithInstructorPresenter.present(course) : undefined,
            assignment: AssignmentPresenter.present(externalAssignmentRecord.assignment),
            studentAssignmentsDetails,
            gradingDetails,
            ltiResourceLink: presentLtiResourceLink(
              externalAssignmentRecord.resourceLink,
              this.platform,
            ),
          }),
      ),
      te.getOrElse((error) => {
        const actualError = error instanceof LtiRepositoryError ? error.cause : error;
        throw ExceptionsFactory.fromError(actualError);
      }),
    )();
  }

  @Post("/assignments/:assignmentId/main-line-item")
  public async chooseMainLineItem(
    @SessionUser() user: User,
    @Param() { assignmentId }: ShowAssignmentsDetailsDto,
    @Param("courseId") courseId: string,
    @Body() { lineItemId }: ChooseMainLineItemDto,
    @Res() res: HttpResponse,
  ) {
    await pipe(
      te.Do,
      te.apS("externalAssignmentRecord", () =>
        this.findExternalLtiAssignmentService.exec({ assignmentId }),
      ),
      te.bindW("course", ({ externalAssignmentRecord }) => {
        const courseId = externalAssignmentRecord.assignment.getCourseId();
        return courseId ? () => this.findCourseByIdService.exec({ courseId }) : te.right(undefined);
      }),
      te.chainFirstEitherKW(({ course }) =>
        course ? e.right(undefined) : e.left(new CourseNotFoundError(courseId)),
      ),
      te.chainFirstW(({ course }) =>
        course?.getInstructor().getId() === user.getId()
          ? te.right(undefined)
          : te.left(new CourseInstructorMismatch(course!.getCourse(), user.getId())),
      ),
      te.chainW(() => () => this.chooseMainLineItemService.exec({ assignmentId, lineItemId })),
      te.getOrElse((error) => {
        const actualError = error instanceof LtiRepositoryError ? error.cause : error;
        throw ExceptionsFactory.fromError(actualError);
      }),
    )();

    return res.redirect(`/lti/ags/assignments/${assignmentId}`);
  }
}

function presentGradingDetails(details: AssignmentGradingDetails) {
  const students = details.courseStudents.map((student) => ({
    id: student.getUser().getId(),
    name: student.getName(),
  }));

  return {
    needsSelection: details.needsSelection,
    hasMoreThanOneLineItem: details.lineItems.length > 1,
    students,
    lineItems: details.lineItems.map((lineItem) => {
      const scores = details.scoresPerLineItem.get(lineItem.id as never);
      return {
        id: lineItem.id,
        label: lineItem.label,
        tag: lineItem.tag ?? null,
        maxScore: lineItem.scoreMaximum,
        isMain: details.mainLineItem?.id === lineItem.id,
        // one cell per student, in the same order as `students`; `null` = no score yet
        cells: students.map((student) => {
          const score = scores?.get(student.id as never);
          return score ? { given: score.scoreGiven, max: score.scoreMaximum } : null;
        }),
      };
    }),
  };
}
