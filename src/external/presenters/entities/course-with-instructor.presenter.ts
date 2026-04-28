import { CourseWithInstructor } from "@/modules/courses-and-enrollments/aggregates/course-with-instructor.aggregate";
import { PersonPresenter, PresentedPerson } from "./person.presenter";

type PresentedCourseWithInstructor = {
  id: string;
  title: string;
  instructor: PresentedPerson;
};

export class CourseWithInstructorPresenter {
  public static present(entity: CourseWithInstructor): PresentedCourseWithInstructor {
    return {
      id: entity.getCourse().getId().toString(),
      title: entity.getCourse().getTitle(),
      instructor: PersonPresenter.present(entity.getInstructor().getPerson()),
    };
  }
}
