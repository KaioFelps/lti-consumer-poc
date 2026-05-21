import { Module } from "@nestjs/common";
import { ContextFetcher } from ".";
import { CourseContextFetcher } from "./course-context-fetcher";

@Module({
  providers: [
    CourseContextFetcher,
    {
      provide: ContextFetcher,
      useFactory: (...fetchers: ContextFetcher[]) => fetchers,
      inject: [CourseContextFetcher],
    },
  ],
  exports: [ContextFetcher],
})
export class ContextFetchersModule {}
