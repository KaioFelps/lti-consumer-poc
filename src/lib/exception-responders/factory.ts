import { HttpRequest } from "@/lib";
import mvc from "../mvc-routes";
import { ExceptionFilterResponder } from "./responder";

export abstract class ExceptionFilterResponderFactory<B = unknown, O = unknown> {
  protected isMVC(request: HttpRequest): boolean {
    return request[mvc.requestKey] ?? false;
  }

  public abstract create(request: HttpRequest): ExceptionFilterResponder<B, O>;
}
