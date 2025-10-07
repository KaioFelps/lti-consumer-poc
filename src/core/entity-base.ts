import { generateUUID, type UUID } from "./uuid";

export abstract class EntityBase<Props> {
  protected constructor(protected props: Props) {}

  protected static generateId(): UUID {
    return generateUUID();
  }
}
