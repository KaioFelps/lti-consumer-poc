import { UUID } from "common/src/types/uuid";
import { EntityBase } from "@/core/entity-base";
import { Person } from "@/modules/identity/person/person.entity";
import { type User } from "@/modules/identity/user/user.entity";
import { Instructor } from "./instructor.entity";

type Props = {
  id: UUID;
  title: string;
  instructorId: User["props"]["id"];
};

export class Course extends EntityBase<Props> {
  public static create(props: Course.ConstructorProps) {
    return new Course({ ...props, id: Course.generateId() });
  }

  public static createUnchecked(props: Props) {
    return new Course(props);
  }

  public getId() {
    return this.props.id;
  }

  public getTitle() {
    return this.props.title;
  }

  public setTitle(value: string) {
    this.props.title = value;
  }

  public isTaughtBy(instructor: Instructor) {
    return instructor.getId() === this.props.instructorId;
  }

  public getInstructorId() {
    return this.props.instructorId;
  }

  public setInstructor(instructor: Person) {
    this.props.instructorId = instructor.getUser().getId();
  }
}

export namespace Course {
  export type ConstructorProps = Omit<Props, "id">;
}
