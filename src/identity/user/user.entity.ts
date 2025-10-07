import { UUIDTypes } from "uuid";
import { EntityBase } from "@/core/entity-base";

export type UserProps = {
  id: UUIDTypes;
  username: string;
  passwordHash: string;
  profilePictureUrl?: string;
};

export class User extends EntityBase<UserProps> {
  public static create(props: UserProps): User {
    return new User(props);
  }
}
