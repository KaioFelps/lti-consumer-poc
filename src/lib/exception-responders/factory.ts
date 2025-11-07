import { HttpRequest } from "@/lib";
import { HANDLER_IS_MVC_KEY } from "../interceptors/mvc-marker.interceptor";
import { ExceptionFilterResponder } from "./responder";

export abstract class ExceptionFilterResponderFactory<
  B = unknown,
  O = unknown,
> {
  protected isMVC(request: HttpRequest): boolean {
    return request[HANDLER_IS_MVC_KEY] ?? false;
  }

  public abstract create(request: HttpRequest): ExceptionFilterResponder<B, O>;
}
