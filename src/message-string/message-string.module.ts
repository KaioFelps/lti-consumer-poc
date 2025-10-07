import { Global, Module } from "@nestjs/common";
import { TranslatorService } from "./translator.service";

@Global()
@Module({
  providers: [TranslatorService],
  exports: [TranslatorService],
})
export class MessageStringModule {}
