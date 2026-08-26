import React, { act } from "react";
import { createRoot } from "react-dom/client";
import Timer, { resolveTimerSeconds } from "./Timer";
import { getExerciseUiText } from "../../exercises/content/uiText";
import { elementaryTools } from "../../exercises/definitions/elementary";

const quickSumsTool = elementaryTools.find((tool) => tool.id === "sommes-rapides");

describe("generic exercise timer", () => {
  test("resolves a duration from the selected difficulty", () => {
    expect(resolveTimerSeconds({ enabled: true, seconds: 12 }, "easy")).toBe(12);
    expect(resolveTimerSeconds({ enabled: true, seconds: { easy: 8, default: 15 } }, "easy")).toBe(8);
    expect(resolveTimerSeconds({ enabled: true, seconds: { default: 15 } }, "hard")).toBe(15);
    expect(resolveTimerSeconds({ enabled: true, seconds: { practice: { 1: 8, 3: 15 } } }, "practice", 3)).toBe(15);
    expect(resolveTimerSeconds(false, "easy")).toBe(0);
  });

  test.each([
    ["addition", 1, 5],
    ["addition", 3, 7],
    ["subtraction", 2, 15],
    ["sum-three-terms", 1, 15],
    ["sum-three-terms", 3, 25],
    ["difficult", null, 20],
  ])("keeps a visible quick-sums duration for %s level %s", (exercise, level, expected) => {
    expect(resolveTimerSeconds(quickSumsTool.timer, exercise, level)).toBe(expected);
  });

  test("expires exactly once", () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onExpire = jest.fn();

    act(() => {
      root.render(
        <Timer
          timer={{ enabled: true, seconds: 1, show: true }}
          difficulty="easy"
          resetKey="question-1"
          paused={false}
          onExpire={onExpire}
          labels={getExerciseUiText("fr")}
        />,
      );
    });
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Temps écoulé");
    expect(container.textContent).not.toContain("Vous pouvez encore répondre");
    expect(container.querySelector(".exercise-timer-expired")).toBeTruthy();

    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  test("restores the full duration when the question changes", () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onExpire = jest.fn();
    const renderTimer = (resetKey) => (
      <Timer
        timer={{ enabled: true, seconds: 1, show: true }}
        difficulty="easy"
        resetKey={resetKey}
        paused={false}
        onExpire={onExpire}
        labels={getExerciseUiText("fr")}
      />
    );

    act(() => root.render(renderTimer("question-1")));
    act(() => jest.advanceTimersByTime(800));
    act(() => root.render(renderTimer("question-2")));
    act(() => jest.advanceTimersByTime(300));
    expect(onExpire).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(800));
    expect(onExpire).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });
});
