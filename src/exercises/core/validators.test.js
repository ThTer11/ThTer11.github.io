import { validateAnswer } from "./validators";

describe("generic mathematical validators", () => {
  test("accepts equivalent rational writings when configured", () => {
    expect(validateAnswer("2/4", { type: "fraction" }, "1/2").correct).toBe(true);
    expect(validateAnswer("0.5", { type: "fraction" }, "1/2").correct).toBe(true);
  });

  test("reports a correct but non-reduced fraction separately", () => {
    const outcome = validateAnswer("6/8", { type: "fraction", requireReduced: true }, "3/4");
    expect(outcome.correct).toBe(false);
    expect(outcome.status).toBe("equivalent");
    expect(outcome.equivalent).toBe(true);
  });

  test("separates equivalence from a factorised-form requirement", () => {
    const outcome = validateAnswer("x^2-1", { type: "expression", requiredForm: "factorized" }, "(x-1)(x+1)");
    expect(outcome.status).toBe("equivalent");
    expect(outcome.correct).toBe(false);
  });

  test("compares solution sets without using order", () => {
    expect(validateAnswer("3/4 ; -2", { type: "solution-set", elementType: "number" }, ["-2", "3/4"]).correct).toBe(true);
    expect(validateAnswer("-2 ; -2 ; 3/4", { type: "solution-set", elementType: "number" }, ["-2", "3/4"]).correct).toBe(false);
  });

  test("checks matrices and multiple fields component by component", () => {
    expect(validateAnswer([["1", "2/4"]], { type: "matrix" }, [[1, "1/2"]]).correct).toBe(true);
    const fields = [
      { id: "x", label: "x", answer: { type: "fraction" } },
      { id: "y", label: "y", answer: { type: "integer" } },
    ];
    expect(validateAnswer({ x: "2/4", y: "-1" }, { type: "multiple-fields", fields }, { x: "1/2", y: -1 }).correct).toBe(true);
  });

  test("supports choices, booleans and custom validators", () => {
    expect(validateAnswer("two", { type: "choice" }, "two").correct).toBe(true);
    expect(validateAnswer(false, { type: "boolean" }, false).correct).toBe(true);
    expect(validateAnswer("ok", { type: "text", validator: (value) => value === "ok" }, null).correct).toBe(true);
  });
});
