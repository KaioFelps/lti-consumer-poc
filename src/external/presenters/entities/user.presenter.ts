import { User } from "@/identity/user/user.entity";

type PresentedUser = {
  id: string;
  systemRole: string;
  username: string;
  profilePictureUrl: string | null;
};

export class UserPresenter {
  public static present(entity: User): PresentedUser {
    return {
      id: entity.getId().toString(),
      profilePictureUrl: entity.getProfilePictureUrl(),
      systemRole: entity.getSystemRole().toString(),
      username: entity.getUsername(),
    };
  }
}
