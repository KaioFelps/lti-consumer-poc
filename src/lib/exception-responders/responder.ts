import { HttpArgumentsHost } from "@nestjs/common/interfaces";

export abstract class ExceptionFilterResponder<B = unknown, Output = unknown> {
  public abstract respond(
    status: number,
    ctx: HttpArgumentsHost,
    body: B,
  ): Promise<Output>;
}
