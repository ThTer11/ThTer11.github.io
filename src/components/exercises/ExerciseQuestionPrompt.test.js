import {
  resolveQuestionPromptUi,
  splitQuestionPrompt,
} from "./ExerciseQuestionPrompt";

describe("compact exercise question prompts", () => {
  test("separates a short instruction from its displayed expression", () => {
    expect(splitQuestionPrompt("Calculer : $$2+3$$")).toEqual({
      instruction: "Calculer",
      expression: "$$2+3$$",
    });
  });

  test("keeps an unstructured statement intact", () => {
    expect(splitQuestionPrompt("Construire une démonstration complète.")).toEqual({
      instruction: "",
      expression: "Construire une démonstration complète.",
    });
  });

  test("allows elementary definitions to override every compact prompt field", () => {
    const promptUi = resolveQuestionPromptUi(
      {
        label: { fr: "À toi", en: "Your move" },
        detail: { fr: "Sans calculatrice", en: "No calculator" },
        icon: "calculator",
        tone: "decision",
      },
      "fr",
    );

    expect(promptUi).toMatchObject({
      label: "À toi",
      detail: "Sans calculatrice",
      icon: "calculator",
      tone: "decision",
    });
  });

  test("allows the secondary detail to be hidden explicitly", () => {
    const promptUi = resolveQuestionPromptUi({
      label: { fr: "Calcule", en: "Calculate" },
      detail: false,
    }, "fr");

    expect(promptUi.label).toBe("Calcule");
    expect(promptUi.detail).toBe("");
  });

  test("accepts a hidden icon or a custom emoji from the definition", () => {
    expect(resolveQuestionPromptUi({ icon: false }, "fr").icon).toBe(false);
    expect(resolveQuestionPromptUi({ icon: "🧠" }, "fr").icon).toBe("🧠");
  });

  test("does not invent a prompt presentation when none is configured", () => {
    expect(resolveQuestionPromptUi(undefined, "fr")).toBeNull();
  });
});
