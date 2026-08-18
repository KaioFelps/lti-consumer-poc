import { Body, Controller, Get, Headers, Param, Post, Query, Res } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { HttpResponse } from "@/lib";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory";
import { Rest } from "@/lib/mvc-routes";
import { AuthStrategy, ConfigAuthGuard } from "@/modules/auth/protected-routes";
import { CurrentTool } from "@/modules/auth/protected-routes/decorators/current-tool";
import { type LtiToolJwtPayload } from "@/modules/auth/protected-routes/lti-tool-jwt-payload";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item";
import { FindContextByIdService } from "../../advantage/context/services/find-context-by-id.service";
import { FindToolByIdService } from "../../tools/services/find-tool-by-id.service";
import { CreateLineItemDTO } from "../dtos/create-line-item.dto";
import { LineItemsContainerFiltersDto } from "../dtos/line-items-container-filters.dto";
import { ContextConcreteType } from "../enums/context-concrete-type";

@Rest()
@Controller("/lti/ags/:contextId/lineitems")
export class LtiLineItemsController {
  public constructor(
    private readonly lineItemsServices: LtiLineItemServices<ContextConcreteType>,
    private readonly findContextByIdService: FindContextByIdService,
    private readonly findToolByIdService: FindToolByIdService,
  ) {}

  // tools first tries to find available line items
  @Get("")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public async listLineItems(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @Query() filters: LineItemsContainerFiltersDto,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Param("contextId") contextId: string,
    @Res() response: HttpResponse,
  ) {
    const resolvedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => typeof value !== "undefined"),
    ) as LineItemsContainerFilters;
    resolvedFilters.page ??= 1;

    return await pipe(
      te.Do,
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.chainW(({ context, tool }) => () => {
        console.log("controller ; filtros", resolvedFilters);
        return this.lineItemsServices.fetchFromContainer({
          acceptHeader,
          contentTypeHeader,
          context,
          tool: tool.record,
          defaultLimit: 24,
          filters: resolvedFilters,
        });
      }),
      te.map((lineItemsResponse) => {
        response
          .setHeaders(lineItemsResponse.headers)
          .status(lineItemsResponse.httpStatusCode)
          .send(lineItemsResponse.content);
      }),
      te.mapLeft((error) => {
        throw ExtendedExceptionsFactory.fromError(error);
      }),
    )();
  }

  // only when there are none available it tries to create one using this endpoint
  @Post("")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public createLineItem(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @Body() body: CreateLineItemDTO,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Param("contextId") contextId: string,
    @Res() response: HttpResponse,
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
      te.map((lineItemsResponse) => {
        response
          .setHeaders(lineItemsResponse.headers)
          .status(lineItemsResponse.httpStatusCode)
          .send(lineItemsResponse.content);
      }),
      te.mapLeft((error) => {
        console.log("n deu bom em criar o line item em", error);
        throw ExtendedExceptionsFactory.fromError(error);
      }),
    )();
  }

  public lineItemsContainer() {}

  public findLineItem() {}
}
