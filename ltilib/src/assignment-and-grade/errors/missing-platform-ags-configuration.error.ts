import { MisconfiguredPlatformError } from "$/core/errors/misconfigured-platform.error";

export class MissingPlatformAgsConfiguration extends MisconfiguredPlatformError {
  public constructor() {
    super(
      "Missing AGS configuration for the requested Assignment and Grade Service operation.",
    );
  }
}
