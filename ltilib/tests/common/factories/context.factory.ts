import { faker } from "@faker-js/faker";
import { generateUUID } from "common/src/types/uuid";
import { Context, ContextType, IContext } from "$/core/context";

type CreateContextConstructorArgs<CT> = Partial<IContext<CT>>;

export const DEFAULT_CONTEXT_TYPE = [ContextType.CourseSection] as const;

export function createContext<CT = never>({
  id = generateUUID(),
  label = faker.lorem.sentence(),
  title = faker.lorem.words({ min: 1, max: 3 }),
  type = [...DEFAULT_CONTEXT_TYPE],
}: CreateContextConstructorArgs<CT> = {}) {
  return Context.create({ id, label, title, type });
}

export default {
  createContext,
  DEFAULT_CONTEXT_TYPE,
};
