import { SetMetadata } from "@nestjs/common";

const ASYNC_RENDER_METADATA = "__async_render_template__";

export const RenderAsync = (template: string) =>
  SetMetadata(ASYNC_RENDER_METADATA, template);

export default {
  metadataKey: ASYNC_RENDER_METADATA,
};
