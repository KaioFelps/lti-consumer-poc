import { UUIDTypes, v7 } from "uuid";

export type UUID = UUIDTypes;

export function generateUUID() {
  return v7();
}
