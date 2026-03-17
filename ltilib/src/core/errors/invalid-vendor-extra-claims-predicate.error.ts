import { InvalidArgumentError } from "./bases/invalid-argument.error";

type Field = "predicate";
type Code = "must_be_url";
export class InvalidVendorExtraClaimsPredicate extends InvalidArgumentError<Field, Code> {}
