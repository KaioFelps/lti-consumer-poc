import { Course } from "@/modules/courses-and-enrollments/entities/course.entity";
import { Context, ContextType } from "$/core/context";
import { ContextConcreteType } from "../../../ags/enums/context-concrete-type";
import { mountContextId } from "..";
import { LtiContextAdapter } from ".";

export class CourseContextAdapter implements LtiContextAdapter<ContextConcreteType> {
  public constructor(private course: Course) {}

  getContext() {
    return Context.create({
      id: mountContextId(this.course.getId().toString(), ContextConcreteType.Course),
      title: this.course.getTitle(),
      type: [ContextType.CourseOffering, ContextConcreteType.Course],
    });
  }
}
