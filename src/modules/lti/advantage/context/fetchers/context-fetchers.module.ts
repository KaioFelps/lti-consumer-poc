import { Module } from "@nestjs/common";
import { CONTEXT_FETCHERS, ContextFetcher } from ".";
import { CourseContextFetcher } from "./course-context-fetcher";

@Module({
  providers: [
    CourseContextFetcher,
    {
      provide: CONTEXT_FETCHERS,
      useFactory: (...fetchers: ContextFetcher[]) => fetchers,
      inject: [CourseContextFetcher],
    },
  ],
  exports: [CONTEXT_FETCHERS],
})
export class ContextFetchersModule {}
