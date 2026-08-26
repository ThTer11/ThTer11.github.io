import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { courseHintsById } from "../../exercises/registry";
import { elementaryTools } from "../../exercises/definitions/elementary";
import ExerciseEngine from "./ExerciseEngine";

const identitiesTool = elementaryTools.find((tool) => tool.id === "identites-remarquables");
const fractionsTool = elementaryTools.find((tool) => tool.id === "fractions-exactes");

describe("IdentityExerciseEngine", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.MathJax = {
      typesetPromise: () => Promise.resolve(),
      typesetClear: () => {},
    };
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0.51);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    delete window.MathJax;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test("renders and validates the true/false answer instead of an expression field", async () => {
    await act(async () => {
      root.render(<ExerciseEngine tool={identitiesTool} lang="fr" courseHints={courseHintsById} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Exercice à travailler");
    expect(container.querySelector(".exercise-level-grid").classList.contains("exercise-level-grid-compact")).toBe(false);
    const optionCards = [...container.querySelectorAll(".exercise-option-card")];
    expect(optionCards).toHaveLength(4);
    expect(optionCards[0].querySelectorAll(".exercise-option-level-dot")).toHaveLength(3);
    const reviewCard = optionCards.find((card) => card.textContent.includes("Bilan"));
    expect(reviewCard.querySelector(".exercise-option-level-dot")).toBeNull();
    expect(reviewCard.classList.contains("exercise-option-card-no-levels")).toBe(true);
    expect(reviewCard.children).toHaveLength(1);
    expect(reviewCard.style.getPropertyValue("--exercise-option-accent")).toBe("#c58a08");

    act(() => Simulate.click(optionCards[0].querySelectorAll(".exercise-option-level-dot")[2]));
    expect(optionCards[0].querySelector(".exercise-option-level-dot-active").textContent).toBe("3");

    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));

    await act(async () => {
      Simulate.click(startButton);
      await Promise.resolve();
    });
    act(() => jest.runOnlyPendingTimers());

    const choices = [...container.querySelectorAll(".exercise-choice")];
    expect(choices.map((button) => button.textContent)).toEqual(["Vrai", "Faux"]);
    expect(container.querySelector(".exercise-text-input")).toBeNull();
    expect(container.textContent).toContain("9x^2");

    act(() => Simulate.click(choices[1]));
    await act(async () => {
      Simulate.submit(container.querySelector("form"));
      await Promise.resolve();
    });

    expect(container.querySelector(".exercise-feedback-success")).toBeTruthy();
  });

  test("shows and opens the identities course reminder after an incorrect answer", async () => {
    await act(async () => {
      root.render(<ExerciseEngine tool={identitiesTool} lang="fr" courseHints={courseHintsById} />);
      await Promise.resolve();
    });

    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));

    await act(async () => {
      Simulate.click(startButton);
      await Promise.resolve();
    });
    act(() => jest.runOnlyPendingTimers());

    const choices = [...container.querySelectorAll(".exercise-choice")];
    act(() => Simulate.click(choices[0]));
    await act(async () => {
      Simulate.submit(container.querySelector("form"));
      await Promise.resolve();
    });

    expect(container.querySelector(".exercise-feedback-danger")).toBeTruthy();
    const reminderButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === "Rappel de cours");
    expect(reminderButton).toBeTruthy();

    await act(async () => {
      Simulate.click(reminderButton);
      await Promise.resolve();
    });

    expect(container.querySelector("[role='dialog']")).toBeTruthy();
    expect(container.textContent).toContain("Les trois identités remarquables");
  });

  test("uses the compact five-column hook for fraction choices", async () => {
    await act(async () => {
      root.render(<ExerciseEngine tool={fractionsTool} lang="fr" courseHints={courseHintsById} />);
      await Promise.resolve();
    });

    const grid = container.querySelector(".exercise-level-grid");
    const optionCards = [...grid.querySelectorAll(".exercise-option-card")];
    const basicsCard = optionCards.find((card) => card.textContent.includes("Bases"));

    expect(grid.classList.contains("exercise-level-grid-compact")).toBe(true);
    expect(optionCards).toHaveLength(5);
    expect(basicsCard.querySelectorAll(".exercise-option-level-dot")).toHaveLength(3);
  });
});
