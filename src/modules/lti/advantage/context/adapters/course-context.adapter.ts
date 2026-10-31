import { Course } from "@/modules/courses-and-enrollments/entities/course.entity.js";
import { ContextConcreteType } from "@/modules/lti/ags/enums/context-concrete-type.js";
import { Context, ContextType } from "$/core/context.js";
import { mountContextId } from "../../context.js";
import { LtiContextAdapter } from "./index.js";

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
