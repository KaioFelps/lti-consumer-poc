import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { BaseExceptionModule } from "../base/base-exception.module.js";
import { RenderableExceptionModule } from "../renderable/renderable-exception.module.js";
import { LtilibExceptionFilter } from "./exception-filter.js";

@Module({
  imports: [RenderableExceptionModule, BaseExceptionModule],
  providers: [{ provide: APP_FILTER, useClass: LtilibExceptionFilter }],
})
export class LtilibExceptionModule {}
