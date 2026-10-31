import { Global, Module } from "@nestjs/common";
import { TranslatorService } from "./translator.service.js";

@Global()
@Module({
  providers: [TranslatorService],
  exports: [TranslatorService],
})
export class MessageStringModule {}
