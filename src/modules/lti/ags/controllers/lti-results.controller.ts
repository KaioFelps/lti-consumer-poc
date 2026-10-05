import { Controller, Get, Headers, Param, Query, Res } from "@nestjs/common";
import { taskEither as te } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { HttpResponse } from "@/lib";
import { ExtendedExceptionsFactory } from "@/lib/exceptions/extended-exceptions.factory";
import { Rest } from "@/lib/mvc-routes";
import { AuthStrategy, ConfigAuthGuard } from "@/modules/auth/protected-routes";
import { CurrentTool } from "@/modules/auth/protected-routes/decorators/current-tool";
import { type LtiToolJwtPayload } from "@/modules/auth/protected-routes/lti-tool-jwt-payload";
import { LtiResultServices } from "$/assignment-and-grade";
import { ResultsContainerFilters } from "$/assignment-and-grade/container-filters";
import { FindContextByIdService } from "../../advantage/context/services/find-context-by-id.service";
import { FindToolByIdService } from "../../tools/services/find-tool-by-id.service";
import { ResultsContainerFiltersDto } from "../dtos/results-container.filters.dto";
import { ContextConcreteType } from "../enums/context-concrete-type";

@Rest()
@Controller("/lti/ags/:contextId/lineitems")
export class LtiResultsController {
  public constructor(
    private readonly resultsServices: LtiResultServices<ContextConcreteType>,
    private readonly findContextByIdService: FindContextByIdService,
    private readonly findToolByIdService: FindToolByIdService,
  ) {}

  @Get(":lineItemId/results")
  @ConfigAuthGuard({ strategy: AuthStrategy.LtiToolsJwt })
  public fetchResultContainer(
    @Headers("accept") acceptHeader: string | undefined,
    @Headers("content-type") contentTypeHeader: string | undefined,
    @CurrentTool() { sub: toolId }: LtiToolJwtPayload,
    @Param("contextId") contextId: string,
    @Param("lineItemId") lineItemId: string,
    @Res() response: HttpResponse,
    @Query() filters: ResultsContainerFiltersDto,
  ) {
    const resolvedFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => typeof value !== "undefined"),
    ) as ResultsContainerFilters;
    resolvedFilters.page ??= 1;

    return pipe(
      te.Do,
      te.apS("tool", () => this.findToolByIdService.exec({ id: toolId })),
      te.apS("context", () => this.findContextByIdService.exec({ contextComposedId: contextId })),
      te.chainW(
        ({ tool, context }) =>
          () =>
            this.resultsServices.fetchResults({
              filters: resolvedFilters,
              tool: tool.record,
              defaultLimit: 24,
              maxLimit: 100,
              acceptHeader,
              context,
              lineItemId,
              contentTypeHeader,
            }),
      ),
      te.map((resultsResponse) => {
        response
          .setHeaders(resultsResponse.headers)
          .status(resultsResponse.httpStatusCode)
          .send(resultsResponse.content);
      }),
      te.mapLeft((error) => {
        throw ExtendedExceptionsFactory.fromError(error);
      }),
    )();
  }
}
