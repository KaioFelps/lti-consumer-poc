import { Module } from "@nestjs/common";
import { CourseContextFetcher } from "./course-context-fetcher.js";
import { CONTEXT_FETCHERS, ContextFetcher } from "./index.js";

@Module({
  providers: [
    CourseContextFetcher,
    {
      provide: CONTEXT_FETCHERS,
      useFactory: (...fetchers: ContextFetcher[]) => fetchers,
      inject: [CourseContextFetcher],
    },
  ],
  exports: [CONTEXT_FETCHERS, CourseContextFetcher],
})
export class ContextFetchersModule {}
