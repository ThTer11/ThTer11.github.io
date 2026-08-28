import {
  createQuestionAvoidingDuplicates,
  createQuestionSignature,
} from "./source";

function generatedTool(generate) {
  return {
    id: "test-tool",
    source: { type: "generator", generate },
  };
}

describe("question uniqueness", () => {
  test("regenerates a question already seen in the current session", () => {
    const prompts = ["A", "A", "B"];
    let generationCount = 0;
    const tool = generatedTool(() => {
      const prompt = prompts[generationCount++] ?? "B";
      return { prompt, expected: prompt };
    });
    const seen = new Set([
      createQuestionSignature({
        prompt: "A",
        expected: "A",
        explanation: "",
        hints: [],
        courseHintIds: [],
      }),
    ]);

    const result = createQuestionAvoidingDuplicates(tool, "simple", Math.random, 1, seen, 5);

    expect(result.question.prompt).toBe("B");
    expect(result.repeated).toBe(false);
    expect(generationCount).toBe(3);
  });

  test("allows a repeat when the generator has no other possibility", () => {
    let generationCount = 0;
    const tool = generatedTool(() => {
      generationCount += 1;
      return { prompt: "Unique question", expected: 1 };
    });
    const first = createQuestionAvoidingDuplicates(tool, "simple", Math.random, 1);
    const seen = new Set([first.signature]);
    const repeated = createQuestionAvoidingDuplicates(tool, "simple", Math.random, 1, seen, 4);

    expect(repeated.question.prompt).toBe("Unique question");
    expect(repeated.repeated).toBe(true);
    expect(generationCount).toBe(5);
  });

  test("selects an unseen bank question without relying on another random draw", () => {
    const tool = {
      id: "bank-tool",
      source: {
        type: "bank",
        questions: [
          { prompt: "A", expected: "A" },
          { prompt: "B", expected: "B" },
        ],
      },
    };
    const first = createQuestionAvoidingDuplicates(tool, "simple", () => 0, 1);
    const second = createQuestionAvoidingDuplicates(
      tool,
      "simple",
      () => 0,
      1,
      new Set([first.signature]),
    );

    expect(first.question.prompt).toBe("A");
    expect(second.question.prompt).toBe("B");
    expect(second.repeated).toBe(false);
  });

  test("does not treat a different correction as a different question", () => {
    const first = createQuestionSignature({
      prompt: "Calculer 2+2",
      expected: 4,
      explanation: "Première explication",
    });
    const second = createQuestionSignature({
      prompt: "Calculer 2+2",
      expected: 4,
      explanation: "Autre explication",
    });

    expect(first).toBe(second);
  });
});
