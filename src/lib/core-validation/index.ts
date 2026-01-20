import { SetMetadata } from "@nestjs/common";
import { HttpRequest } from "..";
import { CoreValidationInterceptor } from "./interceptor";
import { CoreValidationPipe } from "./pipe";

const METADATA_KEY = "coreValidationErrorConfig";
const HANDLER_KEY = "__handler_core_validation_error_config";

export type CoreValidationConfig = {
  renderErrorsWithView?: string;
};

export const ConfigCoreValidation = (config: CoreValidationConfig) => {
  return SetMetadata(METADATA_KEY, config);
};

function attachConfigsToRequest(
  request: HttpRequest,
  config: CoreValidationConfig = {},
) {
  request[HANDLER_KEY] = config;
}

function getConfigsFromRequest(request: HttpRequest): CoreValidationConfig {
  return request[HANDLER_KEY];
}

export default {
  Config: ConfigCoreValidation,
  Pipe: CoreValidationPipe,
  Interceptor: CoreValidationInterceptor,
  metadataKey: METADATA_KEY,
  requestKey: HANDLER_KEY,
  attachConfigsToRequest,
  getConfigsFromRequest,
};
