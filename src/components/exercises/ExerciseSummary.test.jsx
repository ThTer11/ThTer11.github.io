import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { createSession, recordAttempt } from "../../exercises/core/session";
import { getExerciseUiText } from "../../exercises/content/uiText";
import ExerciseSummary from "./ExerciseSummary";

describe("ExerciseSummary", () => {
  test("shows timing, mistake review and the two requested actions", () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onReturn = jest.fn();
    const onRestart = jest.fn();
    let session = createSession(2);

    session = recordAttempt(session, { correct: true, submitted: true }, 1200, {
      prompt: "Calculer $2+3$.",
      submittedAnswer: "5",
      expectedAnswer: "$5$",
    });
    session = recordAttempt(session, { correct: false, submitted: true }, 2400, {
      prompt: "Calculer $7+8$.",
      submittedAnswer: "14",
      expectedAnswer: "$15$",
    });

    act(() => root.render(
      <ExerciseSummary
        session={session}
        labels={getExerciseUiText("fr")}
        lang="fr"
        toolTitle="Sommes rapides"
        onReturn={onReturn}
        onRestart={onRestart}
      />,
    ));

    expect(container.querySelectorAll(".exercise-time-chart-point")).toHaveLength(2);
    expect(container.querySelectorAll(".exercise-summary-mistake")).toHaveLength(1);
    expect(container.textContent).toContain("Calculer $7+8$.");
    expect(container.textContent).toContain("14");
    expect(container.textContent).toContain("15");

    const returnButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Retour à Sommes rapides"));
    const restartButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Recommencer"));
    expect(returnButton).toBeTruthy();
    expect(restartButton).toBeTruthy();

    act(() => returnButton.click());
    act(() => restartButton.click());
    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });
});
