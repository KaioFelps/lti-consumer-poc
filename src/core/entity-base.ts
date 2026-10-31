import { generateUUID, type UUID } from "../../common/src/types/uuid.js";

export abstract class EntityBase<Props> {
  protected constructor(protected props: Props) {}

  protected static generateId(): UUID {
    return generateUUID();
  }
}
