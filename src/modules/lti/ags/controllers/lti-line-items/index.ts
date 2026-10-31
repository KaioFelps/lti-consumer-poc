import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Res,
} from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function.js";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory.js";
import { Rest } from "@/lib/mvc-routes.js";
import type { HttpResponse } from "@/lib.js";
import { CurrentTool } from "@/modules/auth/protected-routes/decorators/current-tool.js";
import { type LtiToolJwtPayload } from "@/modules/auth/protected-routes/lti-tool-jwt-payload.js";
import { AuthStrategy, ConfigAuthGuard } from "@/modules/auth/protected-routes.js";
import { LineItemsContainerFilters } from "$/assignment-and-grade/container-filters.js";
import { LtiLineItemServices } from "$/assignment-and-grade/services/line-item.services.js";
import { FindContextByIdService } from "../../../advantage/context/services/find-context-by-id.service.js";
import { FindToolByIdService } from "../../../tools/services/find-tool-by-id.service.js";
import { CreateLineItemDTO } from "../../dtos/create-line-item.dto.js";
import { FindLineItemByIdParamsDto } from "../../dtos/find-line-item-by-id.dto.js";
import { LineItemsContainerFiltersDto } from "../../dtos/line-items-container-filters.dto.js";
import { UpdateLineItemDTO } from "../../dtos/update-line-item.dto.js";
import { ContextConcreteType } from "../../enums/context-concrete-type.js";

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
        throw ExtendedExceptionsFactory.fromError(error);
      }),
    )();
  }

  @Get(":lineItemId")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public async findLineItem(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @Param() { lineItemId }: FindLineItemByIdParamsDto,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Param("contextId") contextId: string,
    @Res() response: HttpResponse,
  ) {
    return await pipe(
      te.Do,
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.chainW(
        ({ context, tool }) =>
          () =>
            this.lineItemsServices.find({
              acceptHeader,
              contentTypeHeader,
              context,
              lineItemId,
              tool: tool.record,
            }),
      ),
      te.match(
        (error) => {
          throw ExtendedExceptionsFactory.fromError(error);
        },
        (result) => {
          response.setHeaders(result.headers).status(result.httpStatusCode).send(result.content);
        },
      ),
    )();
  }

  @Put(":lineItemId")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public async updateLineItem(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @Param("contextId") contextId: string,
    @Param("lineItemId") lineItemId: string,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Body() body: UpdateLineItemDTO,
    @Res() response: HttpResponse,
  ) {
    return await pipe(
      te.Do,
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.chainW(
        ({ context, tool }) =>
          () =>
            this.lineItemsServices.update({
              ...body,
              acceptHeader,
              contentTypeHeader,
              context,
              lineItemId,
              tool: tool.record,
            }),
      ),
      te.match(
        (error) => {
          throw ExtendedExceptionsFactory.fromError(error);
        },
        (result) => {
          response.setHeaders(result.headers).status(result.httpStatusCode).send(result.content);
        },
      ),
    )();
  }

  @Delete(":lineItemId")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public async deleteLineItem(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @Param("contextId") contextId: string,
    @Param("lineItemId") lineItemId: string,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Res() response: HttpResponse,
  ) {
    return await pipe(
      te.Do,
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.chainW(
        ({ context, tool }) =>
          () =>
            this.lineItemsServices.delete({
              context,
              lineItemId,
              tool: tool.record,
              acceptHeader,
              contentTypeHeader,
            }),
      ),
      te.match(
        (error) => {
          throw ExtendedExceptionsFactory.fromError(error);
        },
        (result) => {
          response.setHeaders(result.headers).status(result.httpStatusCode).send(result.content);
        },
      ),
    )();
  }
}
