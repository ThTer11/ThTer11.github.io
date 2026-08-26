import React, { act } from "react";
import { Simulate } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import ExerciseEngine from "./ExerciseEngine";
import CourseHintModal from "./CourseHintModal";
import { getExerciseUiText } from "../../exercises/content/uiText";
import { courseHintsById, exerciseTools } from "../../exercises/registry";

describe("ExerciseEngine keyboard flow", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.MathJax = {
      typesetPromise: () => Promise.resolve(),
      typesetClear: () => {},
    };
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    delete window.MathJax;
    jest.useRealTimers();
  });

  test("starts, restores focus, validates, then advances with Enter", async () => {
    const tool = {
      id: "keyboard-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      series: { questionCount: 1, choices: [1] },
      score: true,
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $2+3$.", expected: 5 }),
      },
      answer: { type: "integer" },
      feedback: { showCorrection: true },
    };

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });

    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));
    expect(startButton).toBeTruthy();

    await act(async () => {
      Simulate.click(startButton);
      await Promise.resolve();
    });
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const input = container.querySelector(".exercise-text-input");
    expect(input).toBeTruthy();
    expect(document.activeElement).toBe(input);
    expect(container.querySelector(".exercise-question-counter strong").textContent).toBe("1");
    expect(container.querySelector(".exercise-session-scorebar")).toBeTruthy();
    expect(container.querySelector(".exercise-response-placeholder").textContent)
      .toContain("Le résultat et la correction s’afficheront ici");

    act(() => {
      Simulate.change(input, { target: { value: "5" } });
    });
    await act(async () => {
      Simulate.submit(container.querySelector("form"));
      await Promise.resolve();
    });

    expect(container.querySelector(".exercise-feedback-success")).toBeTruthy();
    expect(container.querySelector(".exercise-response-column > .exercise-feedback-success")).toBeTruthy();
    expect(container.querySelector(".exercise-response-placeholder")).toBeNull();

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(container.textContent).toContain("Série terminée");
  });

  test("closes a generic course reminder with Escape", async () => {
    const onClose = jest.fn();
    const hint = {
      id: "demo",
      title: { fr: "Règle utile" },
      content: { fr: "On utilise $a+b=b+a$." },
    };

    await act(async () => {
      root.render(
        <CourseHintModal
          hint={hint}
          lang="fr"
          labels={getExerciseUiText("fr")}
          onClose={onClose}
        />,
      );
      await Promise.resolve();
    });

    expect(container.querySelector("[role='dialog']")).toBeTruthy();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("starts every configured tool with the generic interface", async () => {
    for (const tool of exerciseTools) {
      await act(async () => {
        root.render(
          <ExerciseEngine
            key={tool.id}
            tool={tool}
            lang="fr"
            courseHints={courseHintsById}
          />,
        );
        await Promise.resolve();
      });

      const startButton = [...container.querySelectorAll("button")]
        .find((button) => button.textContent.includes("Démarrer"));
      if (!startButton) {
        throw new Error(`Bouton de démarrage introuvable pour ${tool.id}`);
      }

      await act(async () => {
        Simulate.click(startButton);
        await Promise.resolve();
      });

      if (!container.querySelector(".exercise-workspace")) {
        throw new Error(`Espace d'exercice introuvable pour ${tool.id}`);
      }

      if (tool.id === "inverse-2x2-etapes") {
        expect(container.querySelector(".exercise-multi-fields select")).toBeTruthy();
      }
    }
  });

  test("ends a strict series timer even while feedback is visible", async () => {
    const tool = {
      id: "series-timer-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      series: { questionCount: 2, choices: [2] },
      timer: { enabled: true, mode: "series", seconds: 1, strict: true },
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $2+3$.", expected: 5 }),
      },
      answer: { type: "integer" },
      feedback: { showCorrection: true },
    };

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });
    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));

    await act(async () => {
      Simulate.click(startButton);
      await Promise.resolve();
    });
    const input = container.querySelector(".exercise-text-input");
    act(() => Simulate.change(input, { target: { value: "5" } }));
    await act(async () => {
      Simulate.submit(container.querySelector("form"));
      await Promise.resolve();
    });
    expect(container.querySelector(".exercise-feedback-success")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(container.textContent).toContain("Série terminée");
  });

  test("counts an unanswered strict timeout separately from calculation errors", async () => {
    const tool = {
      id: "strict-question-timer-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      series: { questionCount: 1, choices: [1] },
      timer: { enabled: true, mode: "per-question", seconds: 1, strict: true },
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $2+3$.", expected: 5 }),
      },
      answer: { type: "integer" },
      feedback: { showCorrection: true },
    };

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });
    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));
    await act(async () => Simulate.click(startButton));
    act(() => jest.advanceTimersByTime(1200));

    expect(container.querySelector(".exercise-feedback-timeout")).toBeTruthy();
    expect(container.textContent).toContain("Aucune réponse dans le temps imparti");
    expect(container.querySelector(".exercise-score-item-error strong").textContent).toBe("0");
    expect(container.querySelector(".exercise-score-item-timeout strong").textContent).toBe("1");

    const nextButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Question suivante"));
    act(() => Simulate.click(nextButton));
    expect(container.textContent).toContain("0 / 1");
  });

  test("keeps a late correct answer mathematically correct and marks it out of time", async () => {
    const tool = {
      id: "informative-timer-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      series: { questionCount: 1, choices: [1] },
      timer: { enabled: true, mode: "per-question", seconds: 1, strict: false },
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $2+3$.", expected: 5 }),
      },
      answer: { type: "integer" },
      feedback: { showCorrection: true },
    };

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });
    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));
    await act(async () => Simulate.click(startButton));
    act(() => jest.advanceTimersByTime(1200));

    const input = container.querySelector(".exercise-text-input");
    const expiredNote = container.querySelector(".exercise-answer-expired-note");
    expect(expiredNote.textContent).toContain("Vous pouvez encore répondre");
    expect(input.closest(".exercise-field-label").nextElementSibling).toBe(expiredNote);
    act(() => Simulate.change(input, { target: { value: "5" } }));
    await act(async () => {
      Simulate.submit(container.querySelector("form"));
      await Promise.resolve();
    });

    expect(container.querySelector(".exercise-feedback-late")).toBeTruthy();
    expect(container.textContent).toContain("Juste, mais hors délai");
    expect(container.querySelector(".exercise-score-item-correct strong").textContent).toBe("1");
    expect(container.querySelector(".exercise-score-item-on-time")).toBeNull();
    expect(container.querySelector(".exercise-score-item-timeout strong").textContent).toBe("1");
  });

  test("opens every tool reminder before starting the session", async () => {
    const tool = exerciseTools.find((candidate) => candidate.id === "additions-rapides");

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={courseHintsById} />);
      await Promise.resolve();
    });
    const remindersButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Voir les rappels de cours"));
    expect(remindersButton).toBeTruthy();

    await act(async () => {
      Simulate.click(remindersButton);
      await Promise.resolve();
    });
    expect(container.querySelector("[role='dialog']")).toBeTruthy();
    expect(container.textContent).toContain("Tous les rappels de cours");
    expect(container.textContent).toContain("Addition mentale et compensation");
    expect(container.textContent).toContain("Démarrer la série");
  });

  test("restores explicitly persisted level and series length", async () => {
    const tool = {
      id: "persisted-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      persistSettings: true,
      difficulties: [
        { id: "easy", label: { fr: "Facile" } },
        { id: "hard", label: { fr: "Difficile" } },
      ],
      defaultDifficulty: "easy",
      series: { questionCount: 5, choices: [5, 20] },
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $1+1$.", expected: 2 }),
      },
      answer: { type: "integer" },
    };
    localStorage.setItem(
      "exercise-settings:persisted-demo",
      JSON.stringify({ difficulty: "hard", questionCount: 20 }),
    );

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });

    expect(container.querySelector(".exercise-level-active").textContent).toContain("Difficile");
    const countRange = container.querySelector(".exercise-count-range");
    expect(countRange.value).toBe("1");
    expect(countRange.min).toBe("0");
    expect(countRange.max).toBe("1");
    expect(countRange.getAttribute("aria-valuetext")).toBe("20");
    expect([...container.querySelectorAll(".exercise-count-ticks span")]
      .map((tick) => tick.dataset.value)).toEqual(["5", "20"]);

    act(() => Simulate.change(countRange, { target: { value: "0" } }));
    expect(container.querySelector(".exercise-count-heading output").textContent).toBe("5");
  });

  test("keeps a continuous question-count slider available by configuration", async () => {
    const tool = {
      id: "continuous-count-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      series: {
        questionCount: 5,
        questionCountMode: "continuous",
        minQuestions: 1,
        maxQuestions: 20,
      },
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $1+1$.", expected: 2 }),
      },
      answer: { type: "integer" },
    };

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });

    const countRange = container.querySelector(".exercise-count-range");
    expect(countRange.value).toBe("5");
    expect(countRange.min).toBe("1");
    expect(countRange.max).toBe("20");
    expect(container.querySelector(".exercise-count-ticks")).toBeNull();

    act(() => Simulate.change(countRange, { target: { value: "13" } }));
    expect(container.querySelector(".exercise-count-heading output").textContent).toBe("13");
  });

  test("shows timer icons only on timed exercises and disables the timer per exercise", async () => {
    const tool = {
      id: "per-exercise-timer-demo",
      categoryId: "calcul-elementaire",
      title: { fr: "Démo" },
      description: { fr: "Démo" },
      exercises: [
        { id: "untimed", timer: false, label: { fr: "Sans chrono" } },
        { id: "timed", timer: true, label: { fr: "Avec chrono" } },
      ],
      defaultExercise: "untimed",
      series: { questionCount: 1, choices: [1] },
      timer: {
        enabled: true,
        mode: "per-question",
        seconds: { untimed: 5, timed: 5 },
      },
      source: {
        type: "generator",
        generate: () => ({ prompt: "Calculer $1+1$.", expected: 2 }),
      },
      answer: { type: "integer" },
    };

    await act(async () => {
      root.render(<ExerciseEngine tool={tool} lang="fr" courseHints={{}} />);
      await Promise.resolve();
    });

    const timerIcons = container.querySelectorAll(".exercise-option-timer");
    expect(timerIcons).toHaveLength(1);
    expect(timerIcons[0].closest(".exercise-option-card").textContent).toContain("Avec chrono");

    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer"));
    await act(async () => {
      Simulate.click(startButton);
      await Promise.resolve();
    });

    expect(container.querySelector(".exercise-timer")).toBeNull();
  });
});
