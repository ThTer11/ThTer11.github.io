import { elementaryTools } from "./elementary";

const multiplicationTool = elementaryTools.find((tool) => tool.id === "multiplications-rapides");
const fractionsTool = elementaryTools.find((tool) => tool.id === "fractions-exactes");
const identitiesTool = elementaryTools.find((tool) => tool.id === "identites-remarquables");
const generate = (difficulty, level, rngValue) => multiplicationTool.source.generate({
  difficulty,
  level,
  rng: () => rngValue,
});
const generateFraction = (difficulty, level, rngValue) => fractionsTool.source.generate({
  difficulty,
  level,
  rng: () => rngValue,
});
const sequenceRng = (values, fallback = 0) => {
  let index = 0;

  return () => values[index++] ?? fallback;
};
const mixedFractionRng = (selection) => {
  let first = true;
  let state = 123456789;

  return () => {
    if (first) {
      first = false;
      return selection;
    }

    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

describe("elementary exercise prompt presentation", () => {
  test.each([
    ["sommes-rapides", ["addition", "subtraction", "sum-three-terms", "difficult"]],
    ["multiplications-rapides", ["tables", "simple", "mixed"]],
    ["fractions-exactes", ["basics", "sum", "prod", "comparison", "mixed"]],
    ["identites-remarquables", ["identify", "recognize", "use", "mixed"]],
  ])("defines promptUi on every exercise of %s", (toolId, exerciseIds) => {
    const tool = elementaryTools.find((candidate) => candidate.id === toolId);

    expect(tool).toBeDefined();
    expect(tool.exercises.map((exercise) => exercise.id)).toEqual(exerciseIds);
    tool.exercises.forEach((exercise) => {
      expect(exercise.promptUi).toEqual(expect.objectContaining({
        label: expect.any(Object),
        tone: expect.any(String),
      }));
      expect(exercise.promptUi).toHaveProperty("icon");
    });
  });

  test("keeps the completion label and its development detail side by side", () => {
    const completion = identitiesTool.source.generate({
      difficulty: "use",
      level: 2,
      rng: sequenceRng([0.999999, 0.3, 0.999999, 0, 0.4]),
    });

    expect(completion.variant).toBe("complete-development-difference-square");
    expect(completion.promptUi.label.fr).toBe("Complète");
    expect(completion.promptUi.detail.fr).toBe("le développement");
  });
});

describe("multiplication training generator", () => {
  test("uses progressive ranges for the three simple-product levels", () => {
    expect(generate("simple", 1, 0.999999).operands).toEqual([-35, -5]);
    expect(generate("simple", 2, 0.999999).operands).toEqual([-59, -9]);
    expect(generate("simple", 3, 0.999999).operands).toEqual([-99, -15]);
  });

  test("includes signed operands in tables, simple products and the challenge", () => {
    const questions = [
      generate("tables", null, 0.999999),
      generate("simple", 2, 0.999999),
      generate("mixed", null, 0.999999),
    ];

    questions.forEach((question) => {
      expect(question.operands.every((operand) => operand < 0)).toBe(true);
      expect(question.expected).toBe(question.operands[0] * question.operands[1]);
    });
    expect(questions[2].variant).toBe("mixed");
    expect(questions[2].level).toBeNull();
  });

  test("also keeps positive products in the mix", () => {
    expect(generate("tables", null, 0).operands).toEqual([2, 2]);
  });
});

describe("fraction comparison generator", () => {
  const generateComparison = (rngValue) => generateFraction("comparison", 1, rngValue);

  test("uses one common denominator without repeating the exact same fraction", () => {
    const question = generateComparison(0.999999);
    const { left, right } = question.fractions;

    expect(left.denominator).toBe(right.denominator);
    expect(left.numerator).not.toBe(right.numerator);
    expect(question.expected).not.toBe("=");
  });

  test("allows equality only through two different equivalent writings", () => {
    const question = generateComparison(0);
    const { left, right } = question.fractions;

    expect(question.expected).toBe("=");
    expect(left).not.toEqual(right);
    expect(left.numerator * right.denominator)
      .toBe(right.numerator * left.denominator);
    expect(left.numerator).toBeLessThan(0);
    expect(right.numerator).toBeLessThan(0);
  });
});

describe("fraction negative numerator generation", () => {
  test("also allows negative numerators in simplifications, sums and products", () => {
    const simplification = generateFraction("basics", 1, 0);
    const sum = generateFraction("sum", 1, 0);
    const product = generateFraction("prod", 1, 0);

    expect(simplification.fraction.numerator).toBeLessThan(0);
    expect(simplification.expected.numerator).toBeLessThan(0n);

    expect(sum.fractions.left.numerator).toBeLessThan(0);
    expect(sum.fractions.right.numerator).toBeLessThan(0);
    expect(sum.expected.numerator).toBeLessThan(0n);

    expect(product.fractions.left.numerator).toBeLessThan(0);
    expect(product.fractions.right.numerator).toBeLessThan(0);
    expect(product.expected.numerator).toBeGreaterThan(0n);
  });
});

describe("fraction question prompt presentation", () => {
  test.each([
    [0, "simplify-", "Réduire"],
    [0.18, "add-", "Calculer"],
    [0.35, "subtract-", "Calculer"],
    [0.52, "multiply-", "Calculer"],
    [0.69, "divide-", "Calculer"],
    [0.9, "compare-", "Comparer"],
  ])("adapts the mixed review prompt to the generated question", (selection, variant, label) => {
    const question = fractionsTool.source.generate({
      difficulty: "mixed",
      level: null,
      rng: mixedFractionRng(selection),
    });

    expect(question.variant).toContain(variant);
    expect(question.promptUi.label.fr).toBe(label);
  });
});

describe("notable identity identification generator", () => {
  const generateIdentity = (difficulty, level, values) => (
    identitiesTool.source.generate({
      difficulty,
      level,
      rng: sequenceRng(values),
    })
  );

  const generateIdentityCoefficient = (level, coefficientSelection) => (
    identitiesTool.source.generate({
      difficulty: "identify",
      level,
      rng: sequenceRng([0, 0, coefficientSelection]),
    })
  );

  const generateIdentityDecision = (selectionValue, expectedValue = 0) => (
    identitiesTool.source.generate({
      difficulty: "identify",
      level: 1,
      rng: sequenceRng([
        0,
        expectedValue,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        selectionValue,
      ]),
    })
  );

  test.each([
    [0.51, "decision-develop-sum-square"],
    [0.68, "decision-develop-difference-square"],
    [0.85, "decision-develop-conjugates"],
  ])("recognises factorised expressions that can be expanded", (selectionValue, variant) => {
    const question = generateIdentityDecision(selectionValue);

    expect(question.variant).toBe(variant);
    expect(question.expected).toBe(true);
    expect(question.prompt.fr).toContain("identité remarquable est-elle applicable");
  });

  test("also proposes factorised counterexamples", () => {
    const question = generateIdentityDecision(0.8, 0.999999);

    expect(question.variant).toBe("decision-develop-unequal-factors");
    expect(question.expected).toBe(false);
  });

  test.each([
    [1, 1, 1],
    [2, 2, 5],
    [3, 2, 9],
  ])("uses the full outer-factor range at level %i", (level, minimum, maximum) => {
    const first = generateIdentityCoefficient(level, 0);
    const last = generateIdentityCoefficient(level, 0.999999);

    expect(first.coefficientMode).not.toBe("inner-square");
    expect(last.coefficientMode).not.toBe("inner-square");
    expect(first.leadingCoefficient).toBe(minimum);
    expect(last.leadingCoefficient).toBe(maximum);
  });

  test.each([
    [2, 5, 25],
    [3, 9, 81],
  ])("at level %i, also squares the inner coefficient %i into %i", (level, coefficient, leadingCoefficient) => {
    const question = generateIdentity("recognize", level, [0.999999, 0.999999, 0.999999, 0, 0]);

    expect(question.coefficientMode).toBe("inner-square");
    expect(question.outerCoefficient).toBe(1);
    expect(question.xCoefficient).toBe(coefficient);
    expect(question.leadingCoefficient).toBe(leadingCoefficient);
  });

  test("generates forms such as (3x-2)^2 while retaining outer factors", () => {
    const innerSquare = generateIdentity("recognize", 2, [0.999999, 0.3, 0.999999, 0, 0.4]);
    const outerFactor = generateIdentity("recognize", 2, [0.999999, 0.999999, 0, 0, 0.4]);

    expect(innerSquare.prompt.fr).toContain("(3x-");
    expect(innerSquare.leadingCoefficient).toBe(9);
    expect(outerFactor.prompt.fr).toContain("5(x-");
    expect(outerFactor.leadingCoefficient).toBe(5);
  });

  test.each([
    [0.4, "complete-difference-square", 1],
    [0.999999, "complete-conjugates", 2],
  ])("asks for the missing value in every factorisation form", (identitySelection, variant, blankCount) => {
    const question = generateIdentity("recognize", 1, [0.999999, 0, 0.5, identitySelection]);

    expect(question.variant).toBe(variant);
    expect(question.answer.type).toBe("integer");
    expect(question.expected).toBe(question.shift);
    expect((question.prompt.fr.match(/\\boxed/g) ?? [])).toHaveLength(blankCount);
  });

  test.each([
    [0.4, "recognize-difference-square"],
    [0.999999, "recognize-conjugates"],
  ])("also asks for a complete factorisation from an expanded expression", (identitySelection, variant) => {
    const question = generateIdentity("recognize", 1, [0, 0, 0, identitySelection]);

    expect(question.variant).toBe(variant);
    expect(question.answerForm).toBe("factorized");
    expect(question.prompt.fr).toContain("Factoriser à l'aide");
    expect(question.prompt.fr).not.toContain("\\boxed");
  });

  test("includes the difference-of-squares identity in development questions", () => {
    const question = generateIdentity("use", 1, [0, 0, 0, 0.999999]);

    expect(question.variant).toBe("conjugates");
    expect(question.prompt.fr).toContain("(x-2)(x+2)");
    expect(question.explanation.fr).toContain("a^2-b^2");
  });

  test("develops conjugates with an inner x-coefficient", () => {
    const question = generateIdentity("use", 2, [0, 0.3, 0.999999, 0, 0.999999]);

    expect(question.variant).toBe("conjugates");
    expect(question.prompt.fr).toContain("(3x-2)(3x+2)");
    expect(question.leadingCoefficient).toBe(9);
  });

  test("keeps the development exercise limited to development questions", () => {
    const questions = [0, 0.4, 0.999999].map((identitySelection) => (
      generateIdentity("use", 2, [0, 0, 0, 0, identitySelection])
    ));

    questions.forEach((question) => {
      expect(question.answerForm).toBe("developed");
      expect(question.prompt.fr).toContain("Développer");
      expect(question.prompt.fr).not.toContain("Factoriser");
      expect(question.prompt.fr).not.toContain("\\boxed");
    });
  });

  test("includes missing-middle-term development completions", () => {
    const question = generateIdentity("use", 2, [0.999999, 0.3, 0.999999, 0, 0.4]);

    expect(question.variant).toBe("complete-development-difference-square");
    expect(question.prompt.fr).toContain("Compléter le développement");
    expect(question.prompt.fr).toContain("(3x-2)^2=9x^2");
    expect(question.prompt.fr).toContain("\\boxed");
    expect(question.expected).toBe("-12*x");
  });

  test("also completes a difference-of-squares development", () => {
    const question = generateIdentity("use", 1, [0.999999, 0, 0.5, 0.999999]);

    expect(question.variant).toBe("complete-development-conjugates");
    expect(question.prompt.fr).toContain("(x-4)(x+4)=x^2-");
    expect(question.answer.type).toBe("integer");
    expect(question.expected).toBe(16);
  });

  test("occasionally uses a larger b at level 3", () => {
    const question = generateIdentity("recognize", 3, [0.999999, 0, 0, 0.999999, 0]);

    expect(question.shift).toBe(25);
  });
});
