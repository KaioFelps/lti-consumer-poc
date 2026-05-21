import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Context, ContextType } from "$/core/context";
import { ContextConcreteType } from "../../../ags/enums/context-concrete-type";
import { LtiContextAdapter } from ".";

export class CourseContextAdapter implements LtiContextAdapter {
  public constructor(private course: Course) {}

  getContext(): Context {
    return Context.create({
      id: `${ContextConcreteType.Course}:${this.course.getId().toString()}`,
      title: this.course.getTitle(),
      type: [ContextType.CourseOffering],
    });
  }
}
