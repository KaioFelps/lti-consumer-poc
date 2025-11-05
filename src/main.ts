import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { AppModule } from "./app.module";
import { CoreValidationPipe } from "./lib/pipes/core-validation-pipe";

async function bootstrap() {
  expand(config());

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new CoreValidationPipe());

  app.useStaticAssets(join(__dirname, "../..", "public"));
  app.setBaseViewsDir(join(__dirname, "../..", "views"));
  app.setViewEngine("ejs");

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
