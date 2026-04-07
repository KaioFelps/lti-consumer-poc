import { Either } from "fp-ts/lib/Either";
import { Context, type ContextType } from "../context";
import { LtiRepositoryError } from "../errors/repository.error";
import { LtiTool } from "../tool";
import { LtiToolDeployment } from "../tool-deployment";

export abstract class LtiToolDeploymentsRepository<CustomContextType extends string = never> {
  /**
   * Tries to find a deployment of an LTI tool in given {@link Context `Context`},
   * in one of the parent contexts of the given `context`, or a global deployment.
   *
   * A platform should provide a custom context type in such fashion that allows it to use this
   * type in its implementation of this method. I.e., if a platform organizes its content in
   * a simple two-level hierarchy — e.g., one course has many sections —, and a launch occurs
   * within some inner section, the tool may not have been deployed there, but in the course
   * itself.
   *
   * Using custom context types allows this platform to detect that
   * the current context is a mere section and extend its search to deployments in the course
   * owning the section as well. For this simple scenario, though, the default
   * {@link ContextType.CourseOffering `ContextType.CourseOffering`} and
   * {@link ContextType.Group `ContextType.Group`} context types would be enough.
   *
   * How the platform will implement this deep search is out of scope; however, it might
   * want to use a recursive SQL query or, perhaps, a bunch of OR clauses looking through a
   * polymorphic database table that addresses the deployment for different contexts.
   *
   * @note A deployment with no {@link Context `Context`} associated to it is called global
   * deployment.
   *
   * @example
   * ```ts
   * type CustomContextType = "Course" | "Section";
   *
   * const course: Course;
   * const section: Section;
   *
   * const courseContext = Context.create<CustomContextType>({
   *  // ...
   *  type: "Course",
   *  id: course.id
   * });
   *
   * const sectionContext = Context.create<CustomContextType>({
   *  // ...
   *  type: "Section",
   *  id: `${section.id}-${course.id}`
   * });
   *
   * class MyImplementation extends LtiToolDeploymentsRepository<CustomContextType> {
   *  // ...
   *
   *  public async findDeploymentInContextTreeOrGlobal(toolId: LtiTool["id"], context: Context<CustomContextType>) {
   *    try {
   *      let whereClause;
   *
   *      if (context.type === "Section") {
   *        const [sectionId, courseId] = context.id.split("-");
   *        where = or({ contextId: sectionId, type: "section" }, { contextId: courseId, type: "course" }, { contextId: null });
   *      }
   *      else {
   *        where = or({ contextId: context.id, type: "course" }, { contextId: null });
   *      }
   *
   *      const deployment = await this.someOrmClient.deployments.findFirstOrThrow({ where });
   *      const ltiDeployment = someOrmLtiDeploymentMapper.map(deployment);
   *      return either.right(deployment);
   *    }
   *    catch (e: SomeOrmError) {
   *      if (e.kind === SomeOrmErrorReason.NoRows) {
   *        return e.left(new LtiRepositoryError({ type: "NotFound", subject: LtiToolDeployment.name, cause: e }));
   *      }
   *
   *      return e.left(new LtiRepositoryError({ type: "NotFound", cause: e}))
   *    }
   *   }
   * }
   * ```
   */
  public abstract findDeploymentInContextTreeOrGlobal(
    toolId: LtiTool["id"],
    context: Context<CustomContextType>,
  ): Promise<Either<LtiRepositoryError, LtiToolDeployment>>;
}
