import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { AppModule } from "./app.module";

async function bootstrap() {
  expand(config());

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        excludeExtraneousValues: true,
        strategy: "exposeAll",
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
