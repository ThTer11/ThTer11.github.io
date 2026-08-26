import { resolveAnswerSpec } from "./answerSpec";

describe("resolveAnswerSpec", () => {
  test("keeps tool defaults when the question uses the same answer type", () => {
    const validator = jest.fn();

    expect(resolveAnswerSpec(
      { type: "expression", validator, placeholder: "Expression" },
      { type: "expression", requiredForm: "factorized" },
    )).toEqual({
      type: "expression",
      validator,
      placeholder: "Expression",
      requiredForm: "factorized",
    });
  });

  test("drops options from the previous type when a question changes type", () => {
    const validator = jest.fn();

    expect(resolveAnswerSpec(
      { type: "expression", validator, placeholder: "Expression" },
      { type: "boolean" },
    )).toEqual({ type: "boolean" });
  });

  test("keeps an explicit validator belonging to the new type", () => {
    const validator = jest.fn();

    expect(resolveAnswerSpec(
      { type: "expression", placeholder: "Expression" },
      { type: "boolean", validator },
    )).toEqual({ type: "boolean", validator });
  });
});
