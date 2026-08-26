import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

describe("application routes", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.MathJax = {
      typesetPromise: () => Promise.resolve(),
      typesetClear: () => {},
    };
    window.scrollTo = jest.fn();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.className = "";
    localStorage.clear();
    delete window.MathJax;
  });

  async function renderRoute(path) {
    await act(async () => {
      root.render(
        <MemoryRouter
          initialEntries={[path]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
  }

  test("renders the configurable training catalogue", async () => {
    await renderRoute("/fr/entrainements");
    expect(container.querySelectorAll(".exercise-category-card")).toHaveLength(4);
    expect(container.textContent).toContain("S'entraîner en mathématiques");
  });

  test("renders a category from the registry without a dedicated route", async () => {
    await renderRoute("/fr/entrainements/calcul-elementaire");
    expect(container.querySelectorAll(".exercise-tool-card")).toHaveLength(10);
    expect(container.textContent).toContain("Additions rapides");
  });

  test("renders a shareable tool URL with the generic engine", async () => {
    await renderRoute("/fr/entrainements/calcul-elementaire/sommes-rapides");
    expect(container.querySelector(".exercise-page-setup")).toBeTruthy();
    expect(container.querySelector(".exercise-tool-hero").textContent).toContain("Sommes rapides");
    expect(container.textContent).toContain("Démarrer la série");
    const countRange = container.querySelector(".exercise-count-range");
    expect(countRange.min).toBe("0");
    expect(countRange.max).toBe("3");
    expect([...container.querySelectorAll(".exercise-count-ticks span")]
      .map((tick) => tick.dataset.value)).toEqual(["5", "10", "15", "20"]);
    expect(container.querySelectorAll(".exercise-option-timer")).toHaveLength(4);
  });

  test("returns from a running session to the current tool setup", async () => {
    await renderRoute("/fr/entrainements/calcul-elementaire/sommes-rapides");

    expect(container.querySelector("a.exercise-back-link").textContent).toContain("Retour à Calcul mental");
    const startButton = [...container.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Démarrer la série"));

    await act(async () => {
      startButton.click();
      await Promise.resolve();
    });

    const returnButton = container.querySelector("button.exercise-back-link");
    expect(returnButton).toBeTruthy();
    expect(returnButton.textContent).toContain("Retour à Sommes rapides");
    expect(container.querySelector(".exercise-tool-hero")).toBeNull();
    expect(container.querySelector(".exercise-page-session")).toBeTruthy();
    expect(container.querySelector(".exercise-session-scorebar")).toBeTruthy();
    expect(container.querySelectorAll(".exercise-session-scorebar .exercise-score-item")).toHaveLength(4);
    expect(container.querySelector(".exercise-response-placeholder").textContent)
      .toContain("Le résultat et la correction s’afficheront ici");

    await act(async () => {
      returnButton.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Démarrer la série");
    expect(container.querySelector("a.exercise-back-link").textContent).toContain("Retour à Calcul mental");
  });

  test("keeps an existing specialised teaching route working", async () => {
    await renderRoute("/fr/inverse");
    expect(container.querySelector(".gauss-page")).toBeTruthy();
    expect(container.textContent).toContain("Inversion de matrices pas à pas");
  });
});
