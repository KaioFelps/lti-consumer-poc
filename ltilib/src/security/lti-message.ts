import { Either } from "fp-ts/lib/Either";

export interface LtiInitiationMessage {
  intoUrl(): URL;
}

export interface LtiSubmittableMessage<Error = never> {
  intoForm(): Promise<Either<Error, string>>;
}
