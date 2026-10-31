import { SetMetadata } from "@nestjs/common";

const HANDLER_KEY = "__handler_metadata_is_mvc";
const METADATA_KEY = "isMVCRoute";

export const Mvc = () => SetMetadata(METADATA_KEY, true);
export const Rest = () => SetMetadata(METADATA_KEY, false);

export default {
  requestKey: HANDLER_KEY,
  metadataKey: METADATA_KEY,
};
