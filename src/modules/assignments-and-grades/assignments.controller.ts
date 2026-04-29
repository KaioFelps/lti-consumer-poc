import { Body, Controller, Get, Param, Post, Render } from "@nestjs/common";
import { UUID } from "common/src/types/uuid";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { TranslatorService } from "@/message-string/translator.service";
import { SessionUser } from "../auth/session-user";
import { User } from "../identity/user/user.entity";
import { CreateAssignmentDTO } from "./dtos/create-assignment.dto";
import { CreateAssignmentService } from "./services/create-assignment.service";

@Controller("/courses/:courseId/assignments")
export class AssignmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly createAssignmentService: CreateAssignmentService,
  ) {}

  @Get("create")
  @Render("assignments/new")
  public async showCreateAssignmentForm() {
    const title = await this.t.translate("assignments:create-assignment:title");
    return { title };
  }

  @Post("create")
  public createAssignment(
    @Param("courseId") courseId: UUID,
    @SessionUser() user: User,
    @Body() dto: CreateAssignmentDTO,
  ) {
    return pipe(
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
  }
}
