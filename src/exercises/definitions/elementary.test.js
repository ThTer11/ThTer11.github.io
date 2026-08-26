import { resolveAnswerSpec } from "../core/answerSpec";
import { createQuestion } from "../core/source";
import { validateAnswer } from "../core/validators";
import { elementaryTools } from "./elementary";

const identitiesTool = elementaryTools.find((tool) => tool.id === "identites-remarquables");
const quickSumsTool = elementaryTools.find((tool) => tool.id === "sommes-rapides");

function constantRng(value) {
  return () => value;
}

function sequenceRng(values) {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1] ?? 0;
}

function seededRng(seed) {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function displayedLeadingCoefficients(question) {
  const answerDisplay = typeof question.answerDisplay === "string"
    ? question.answerDisplay
    : question.answerDisplay?.fr ?? "";
  const renderedQuestion = `${question.prompt.fr} ${answerDisplay}`;

  return [...renderedQuestion.matchAll(/(\d+)?x\^2/g)]
    .map((match) => Number(match[1] ?? 1));
}

describe("identités remarquables", () => {
  test("offers a dedicated true/false identification level", () => {
    expect(identitiesTool.defaultExercise).toBe("identify");
    expect(identitiesTool.exercises.some((exercise) => exercise.id === "identify")).toBe(true);

    const questions = [0, 0.13, 0.26, 0.38, 0.51, 0.64, 0.76, 0.89]
      .map((value) => createQuestion(identitiesTool, "identify", constantRng(value), 1));

    expect(new Set(questions.map((question) => question.expected))).toEqual(new Set([true, false]));

    questions.forEach((question) => {
      const spec = resolveAnswerSpec(identitiesTool.answer, question.answer);

      expect(spec).toEqual({ type: "boolean" });
      expect(typeof question.expected).toBe("boolean");
      expect(question.answerDisplay.fr).toBe(question.expected ? "Vrai" : "Faux");
      expect(validateAnswer(question.expected, spec, question.expected, question, "fr").correct).toBe(true);
      expect(validateAnswer(!question.expected, spec, question.expected, question, "fr").correct).toBe(false);
    });
  });

  test("generates several dynamic families of false identities", () => {
    const rng = seededRng(20260826);
    const falseQuestions = Array.from({ length: 300 }, () =>
      createQuestion(identitiesTool, "identify", rng, 3))
      .filter((question) => question.expected === false);
    const variants = new Set(falseQuestions.map((question) => question.variant));
    const prompts = new Set(falseQuestions.map((question) => question.prompt.fr));
    const sumsOfSquares = new Set(
      falseQuestions
        .filter((question) => question.variant === "decision-sum-of-squares")
        .map((question) => question.prompt.fr),
    );

    expect(variants).toEqual(new Set([
      "decision-sum-of-squares",
      "decision-wrong-constant",
      "decision-wrong-middle",
      "decision-incompatible-signs",
      "decision-stray-middle-term",
      "decision-non-square-leading-term",
    ]));
    expect(prompts.size).toBeGreaterThan(40);
    expect(sumsOfSquares.size).toBeGreaterThan(4);
  });

  test.each([
    [1, 1, 1],
    [2, 2, 5],
    [3, 2, 9],
  ])("keeps coefficients of x² in the requested range at level %s", (level, minimum, maximum) => {
    ["identify", "recognize", "use"].forEach((exercise, exerciseIndex) => {
      const rng = seededRng(1000 * level + exerciseIndex);

      for (let index = 0; index < 100; index += 1) {
        const question = createQuestion(identitiesTool, exercise, rng, level);
        const coefficients = displayedLeadingCoefficients(question);

        expect(coefficients.length).toBeGreaterThan(0);
        coefficients.forEach((coefficient) => {
          expect(coefficient).toBeGreaterThanOrEqual(minimum);
          expect(coefficient).toBeLessThanOrEqual(maximum);
        });

        if (exercise !== "identify") {
          const spec = resolveAnswerSpec(identitiesTool.answer, question.answer);
          expect(validateAnswer(question.expected, spec, question.expected, question, "fr").correct).toBe(true);
        }
      }
    });
  });

  test("never displays the coefficient 1 in front of x", () => {
    const development = createQuestion(identitiesTool, "use", constantRng(0), 1);
    const factorization = createQuestion(identitiesTool, "recognize", constantRng(0), 1);
    const completion = createQuestion(
      identitiesTool,
      "recognize",
      sequenceRng([0.9, 0, 0, 0]),
      1,
    );

    [development, factorization, completion].forEach((question) => {
      expect(question.prompt.fr).not.toMatch(/(^|[^0-9])1x/);
      expect(String(question.answerDisplay)).not.toMatch(/(^|[^0-9])1x/);
    });
  });

  test("can switch between boolean and expression answers in mixed mode", () => {
    const decision = createQuestion(identitiesTool, "mixed", constantRng(0.1));
    const calculation = createQuestion(identitiesTool, "mixed", constantRng(0.4));

    expect(resolveAnswerSpec(identitiesTool.answer, decision.answer).type).toBe("boolean");
    expect(resolveAnswerSpec(identitiesTool.answer, calculation.answer).type).toBe("expression");
  });
});

describe("sommes rapides", () => {
  test("generates three operands for the three-term exercise", () => {
    const question = createQuestion(quickSumsTool, "sum-three-terms", constantRng(0.5), 2);
    const operands = question.prompt.fr.match(/-?\d+/g) ?? [];

    expect(operands).toHaveLength(3);
  });
});
