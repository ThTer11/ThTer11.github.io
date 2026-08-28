import {
  formatSubmittedAnswer,
  isPlainTextExpectedAnswer,
} from "./ExerciseSummary";

const labels = {
  true: "Vrai",
  false: "Faux",
  noAnswer: "Aucune réponse",
};

describe("exercise summary submitted answers", () => {
  test("localises boolean answers instead of displaying JavaScript values", () => {
    expect(formatSubmittedAnswer(true, labels)).toBe("Vrai");
    expect(formatSubmittedAnswer(false, labels)).toBe("Faux");
  });

  test("does not confuse false with a missing answer", () => {
    expect(formatSubmittedAnswer(false, labels)).not.toBe(labels.noAnswer);
  });

  test("uses the submitted-answer format for plain expected text only", () => {
    expect(isPlainTextExpectedAnswer("Faux")).toBe(true);
    expect(isPlainTextExpectedAnswer("$$x^2-4$$")).toBe(false);
    expect(isPlainTextExpectedAnswer("\\(x+1\\)")).toBe(false);
  });
});
