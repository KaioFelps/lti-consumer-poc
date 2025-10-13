import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { AppModule } from "./app.module";
import { CoreValidationPipe } from "./lib/pipes/core-validation-pipe";

async function bootstrap() {
  expand(config());

  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(new CoreValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
