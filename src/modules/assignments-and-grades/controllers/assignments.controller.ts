import { Controller, Get, Param, Render } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { AssignmentPresenter } from "@/external/presenters/entities/assignment.presenter";
import { CourseWithInstructorPresenter } from "@/external/presenters/entities/course-with-instructor.presenter";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { FindCourseByIdService } from "@/modules/courses-and-enrollments/services/find-course-by-id.service";
import { ShowAssignmentsDetailsDto } from "../dtos/show-assignments-details-params.dto";
import { FindAssignmentByIdService } from "../services/find-assignment-by-id.service";

@Mvc()
@Controller("assignments")
export class AssignmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly findCourseByIdService: FindCourseByIdService,
    private readonly findAssignmentByIdService: FindAssignmentByIdService,
  ) {}

  @Render("assignments/details")
  @Get(":assignmentId")
  public showAssignmentDetails(@Param() { assignmentId }: ShowAssignmentsDetailsDto) {
    return pipe(
      te.Do,
      te.apS("assignment", () => this.findAssignmentByIdService.exec({ assignmentId })),
      te.bindW("course", ({ assignment }) => {
        const courseId = assignment.getCourseId();
        return courseId ? () => this.findCourseByIdService.exec({ courseId }) : te.right(undefined);
      }),
      te.chainTaskK(({ course, assignment }) => async () => ({
        title: await this.t.translate("assignments:details:title", {
          courseTitle: course?.getCourse().getTitle(),
          assignmentTitle: assignment.getTitle(),
        }),
        course: course ? CourseWithInstructorPresenter.present(course) : undefined,
        assignment: AssignmentPresenter.present(assignment),
      })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();
  }
}
