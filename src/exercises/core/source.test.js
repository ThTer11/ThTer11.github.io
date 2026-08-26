import { createQuestion, generateQuestionFromSource } from "./source";

describe("exercise sources", () => {
  test("passes difficulty and injected RNG to a generator", () => {
    const tool = {
      id: "demo",
      source: {
        type: "generator",
        generate: ({ difficulty, rng }) => ({ prompt: difficulty, expected: rng() }),
      },
    };
    expect(createQuestion(tool, "hard", () => 0.25)).toMatchObject({ prompt: "hard", expected: 0.25 });
  });

  test("passes the exercise variant and its actual level separately", () => {
    const tool = {
      id: "nested-level-demo",
      source: {
        type: "generator",
        generate: ({ difficulty, exercise, level }) => ({
          prompt: `${exercise}/${difficulty}/${level}`,
          expected: level,
        }),
      },
    };

    expect(createQuestion(tool, "factor", () => 0, 3)).toMatchObject({
      prompt: "factor/factor/3",
      expected: 3,
    });
  });

  test("filters a bank by difficulty", () => {
    const question = generateQuestionFromSource({
      type: "bank",
      questions: [
        { prompt: "easy", expected: 1, difficulty: "easy" },
        { prompt: "hard", expected: 2, difficulty: "hard" },
      ],
    }, { difficulty: "hard", rng: () => 0 });
    expect(question.prompt).toBe("hard");
  });

  test("selects weighted variants deterministically", () => {
    const source = {
      type: "mix",
      sources: [
        { id: "first", weight: 1, source: { type: "bank", questions: [{ prompt: "a", expected: 1 }] } },
        { id: "second", weight: 3, source: { type: "bank", questions: [{ prompt: "b", expected: 2 }] } },
      ],
    };
    expect(generateQuestionFromSource(source, { rng: () => 0.99 }).variant).toBe("second");
  });
});
