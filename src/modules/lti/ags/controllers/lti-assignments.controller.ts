import { Body, Controller, Get, Post, Render } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { LtiToolPreviewPresenter } from "@/external/presenters/entities/lti-tool-preview.presenter";
import { ExceptionsFactory } from "@/lib/exceptions/exceptions.factory";
import { Mvc } from "@/lib/mvc-routes";
import { TranslatorService } from "@/message-string/translator.service";
import { FindManyToolsPreviewsService } from "../../tools/services/find-many-tools-previews.service";
import { CreateExternalLtiAssignmentDto } from "../dtos/create-external-lti-assignment.dto";
import { CreateExternalLtiAssignmentService } from "../services/create-external-lti-assignment.service";

@Mvc()
@Controller("lti/ags/assignments")
export class LtiAssignmentsController {
  public constructor(
    private readonly t: TranslatorService,
    private readonly findToolsService: FindManyToolsPreviewsService,
    private readonly createExternalLtiAssignmentService: CreateExternalLtiAssignmentService,
  ) {}

  @Get("new")
  @Render("assignments/new-lti")
  public async createNewExternalAssignment() {
    const title = await this.t.translate("lti:ags:create-assignment:title");
    return await pipe(
      () => this.findToolsService.exec(),
      te.map((previews) => previews.map(LtiToolPreviewPresenter.present)),
      te.map((toolsPreviews) => ({ title, registeredTools: toolsPreviews })),
      te.getOrElse((error) => {
        throw ExceptionsFactory.fromError(error);
      }),
    )();
  }

  @Post("new")
  public async storeNewExternalAssignment(@Body() body: CreateExternalLtiAssignmentDto) {
    const r = this.createExternalLtiAssignmentService.execute({
      assignment: body.assignment,
      resourceLink: {
        resourceUrl: new URL(body.resourceLink.resourceUrl),
        customParameters: body.resourceLink.customParameters,
      },
      toolId: body.toolId,
    });
    console.log(body);
  }
}
