import { ResourceNotFoundError } from "@/core/errors/resource-not-found.error";

export class ScoreNotFoundError extends ResourceNotFoundError {
  public constructor() {
    super({
      errorMessageIdentifier: "lti:ags:score-not-found",
      messageParams: {},
    });
  }
}
