import { either } from "fp-ts";
import { CPF } from "./cpf";

describe("CPF value-object", () => {
  it("should correctly store a valid CPF", () => {
    const parsedCPF = CPF.parseFromString("111.222.333-45");

    expect(either.isRight(parsedCPF)).toBeTruthy();

    if (either.isRight(parsedCPF)) {
      const cpf = parsedCPF.right;
      expect(cpf.toRawString()).toStrictEqual("11122233345");
      expect(cpf.toString()).toStrictEqual("111.222.333-45");
    }
  });

  it("should not parse CPFs with invalid characters or invalid sizes", () => {
    const cpfs = [
      "123.456.789-1a",
      "123.456.@89-10",
      "1235456.789-13",
      "123.456.78-10",
    ];

    for (const cpf of cpfs) {
      expect(either.left(CPF.parseFromString(cpf))).toBeTruthy();
    }
  });
});
