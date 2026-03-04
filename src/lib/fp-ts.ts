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
    taskEither.map(taskEither.fromEither),
    taskEither.flatten,
  );
}
