import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { createSession, recordAttempt } from "../../exercises/core/session";
import { getExerciseUiText } from "../../exercises/content/uiText";
import ScorePanel from "./ScorePanel";

describe("ScorePanel streak display", () => {
  let container;
  let root;
  const labels = getExerciseUiText("fr");

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  test("shows the current streak during a session and animates its loss", () => {
    let session = createSession(3);
    const render = () => root.render(<ScorePanel session={session} labels={labels} compact />);

    act(render);
    let streakCard = container.querySelector(".exercise-score-item-streak");
    expect(streakCard.textContent).toContain("Série actuelle");
    expect(streakCard.querySelector(".exercise-streak-flame")).toBeNull();
    expect(streakCard.querySelector(".exercise-streak-flame-slot")).toBeTruthy();

    session = recordAttempt(session, { correct: true, submitted: true });
    act(render);
    streakCard = container.querySelector(".exercise-score-item-streak");
    expect(streakCard.querySelector(".exercise-score-value").textContent).toContain("1");
    expect(streakCard.querySelector(".exercise-streak-flame")).toBeTruthy();
    expect(streakCard.querySelector(".exercise-score-value-with-flame")).toBeTruthy();

    session = recordAttempt(session, { correct: true, timing: "late", submitted: true });
    act(render);
    streakCard = container.querySelector(".exercise-score-item-streak");
    expect(streakCard.classList.contains("exercise-score-item-streak-lost")).toBe(true);
    expect(streakCard.querySelector(".exercise-streak-flame-lost")).toBeTruthy();

    act(() => jest.advanceTimersByTime(700));
    expect(container.querySelector(".exercise-streak-flame")).toBeNull();
  });

  test("reserves the best streak for the final summary", () => {
    let session = createSession(3);
    session = recordAttempt(session, { correct: true, submitted: true });
    session = recordAttempt(session, { correct: true, submitted: true });
    session = recordAttempt(session, { correct: false, submitted: true });

    act(() => root.render(<ScorePanel session={session} labels={labels} />));

    const streakCard = container.querySelector(".exercise-score-item-streak");
    expect(streakCard.textContent).toContain("Meilleure série de réponses correctes");
    expect(streakCard.textContent).not.toContain("Série actuelle");
    expect(streakCard.querySelector(".exercise-score-value").textContent).toContain("2");
    expect(streakCard.querySelector(".exercise-streak-flame")).toBeTruthy();
  });
});
