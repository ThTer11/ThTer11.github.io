import { elementaryTools } from "./elementary";

const multiplicationTool = elementaryTools.find((tool) => tool.id === "multiplications-rapides");
const generate = (difficulty, level, rngValue) => multiplicationTool.source.generate({
  difficulty,
  level,
  rng: () => rngValue,
});

describe("multiplication training generator", () => {
  test("uses progressive ranges for the three simple-product levels", () => {
    expect(generate("simple", 1, 0.999999).operands).toEqual([-35, -5]);
    expect(generate("simple", 2, 0.999999).operands).toEqual([-59, -9]);
    expect(generate("simple", 3, 0.999999).operands).toEqual([-99, -15]);
  });

  test("includes signed operands in tables, simple products and the review", () => {
    const questions = [
      generate("tables", null, 0.999999),
      generate("simple", 2, 0.999999),
      generate("mixed", null, 0.999999),
    ];

    questions.forEach((question) => {
      expect(question.operands.every((operand) => operand < 0)).toBe(true);
      expect(question.expected).toBe(question.operands[0] * question.operands[1]);
    });
    expect(questions[2].variant).toBe("mixed-simple");
    expect(questions[2].level).toBe(3);
  });

  test("also keeps positive products in the mix", () => {
    expect(generate("tables", null, 0).operands).toEqual([2, 2]);
  });
});
