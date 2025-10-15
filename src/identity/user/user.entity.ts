import { Optional } from "common/src/types/optional";
import { UUIDTypes } from "uuid";
import { EntityBase } from "@/core/entity-base";
import { SystemRole } from "./enums/system-role";

export type UserProps = {
  id: UUIDTypes;
  username: string;
  passwordHash: string;
  profilePictureUrl?: string;
  systemRole: SystemRole;
};

export type UserUncheckedProps = {
  id: UUIDTypes;
  username: string;
  passwordHash: string;
  profilePictureUrl?: string | null;
  systemRole: SystemRole;
};

export class User extends EntityBase<UserProps> {
  public static create(
    props: Omit<Optional<UserProps, "systemRole">, "id">,
  ): User {
    // Filling the props object this way instead of simpling spreading ...props
    // avoid filling the entity `props` protected field with unexpected
    // properties.
    // Unexpected properties won't be persisted.
    return new User({
      id: User.generateId(),
      passwordHash: props.passwordHash,
      systemRole: props.systemRole ?? SystemRole.User,
      username: props.username,
      profilePictureUrl: props.profilePictureUrl,
    });
  }

  public static createUnchecked(props: UserUncheckedProps): User {
    return new User({
      id: props.id,
      passwordHash: props.passwordHash,
      systemRole: props.systemRole,
      username: props.username,
      profilePictureUrl: props.profilePictureUrl ?? undefined,
    });
  }

  public getPasswordHash(): string {
    return this.props.passwordHash;
  }
}
