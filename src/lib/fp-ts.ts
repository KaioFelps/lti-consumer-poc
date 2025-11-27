import { taskEither } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { TaskEither } from "fp-ts/lib/TaskEither";

/**
 * Maps an asynchronous function returning some `Either` monad to
 * a `TaskEither` of the same types.
 *
 * @param promise The promise to parse to `TaskEither`
 * @returns a `TaskEither` of the same values returned by the promise.
 */
export function eitherPromiseToTaskEither<E, V>(
  promise: () => Promise<Either<E, V>>,
): TaskEither<E, V> {
  return pipe(
    taskEither.fromTask(promise),
    (a) => a,
    taskEither.map(taskEither.fromEither),
    taskEither.flatten,
  );
}

/**
 * Maps the value of a `TaskEither` into a transformation promise and flats the transformation
 * into another `TaskEither`
 *
 * @param promise The transformation promise to be applied to the right value from `TaskEither`
 * @returns a `TaskEither` of the new value and flatten errors.
 */
export function mapTaskEitherEitherAndFlatten<E1, V, E2, V2>(
  promise: (value: V) => Promise<Either<E2, V2>>,
) {
  return (te: TaskEither<E1, V>) =>
    pipe(
      te,
      taskEither.map((value) =>
        eitherPromiseToTaskEither(() => promise(value)),
      ),
      taskEither.flattenW,
    );
}
