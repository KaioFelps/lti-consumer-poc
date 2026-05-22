import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Rest } from "@/lib/mvc-routes";
import { AuthStrategy, ConfigAuthGuard } from "@/modules/auth/protected-routes";
import { CurrentTool } from "@/modules/auth/protected-routes/decorators/current-tool";
import { LtiToolJwtPayload } from "@/modules/auth/protected-routes/lti-tool-jwt-payload";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { FindContextByIdService } from "../../advantage/context/services/find-context-by-id.service";
import { FindToolByIdService } from "../../tools/services/find-tool-by-id.service";
import { CreateLineItemDTO } from "../dtos/create-line-item.dto";
import { ContextConcreteType } from "../enums/context-concrete-type";

@Rest()
@Controller("/lti/ags/:contextId/lineitems")
export class LtiLineItemsController {
  public constructor(
    private readonly lineItemsServices: LtiLineItemServices<ContextConcreteType>,
    private readonly findContextByIdService: FindContextByIdService,
    private readonly findToolByIdService: FindToolByIdService,
  ) {}

  @Post("")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public createLineItem(
    @Headers("accept") acceptHeader: string,
    @Headers("content-type") contentTypeHeader: string,
    @Body() body: CreateLineItemDTO,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Param(":contextId") contextId: string,
  ) {
    return pipe(
      te.Do,
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.chainW(
        ({ tool, context }) =>
          () =>
            this.lineItemsServices.create({
              ...body,
              acceptHeader,
              contentTypeHeader,
              context,
              tool: tool.record,
            }),
      ),
    )();
  }

  public lineItemsContainer() {}

  public findLineItem() {}
}
