// EXEMPLE AVANCÉ — générateur + niveaux + variantes + timer + LaTeX
// + rappel de cours + insight.

import { randomInteger, weightedPick } from "../core/random";

function generatePowerQuestion({ difficulty, rng }) {
  const base = randomInteger(2, difficulty === "advanced" ? 7 : 5, rng);
  const firstExponent = randomInteger(1, 6, rng);
  const secondExponent = randomInteger(1, 6, rng);
  const variant = weightedPick([
    { id: "product", weight: 3 },
    { id: "quotient", weight: difficulty === "advanced" ? 2 : 0 },
  ], rng).id;

  if (variant === "quotient") {
    return {
      prompt: `Simplifier $\\dfrac{${base}^{${firstExponent + secondExponent}}}{${base}^{${secondExponent}}}$.`,
      expected: `${base}^${firstExponent}`,
      explanation: "$a^p/a^q=a^{p-q}$ pour une même base non nulle.",
      insight: "Soustraire les exposants évite de calculer les deux puissances.",
      courseHintIds: ["elementary-power-rules"],
    };
  }

  return {
    prompt: `Simplifier $${base}^{${firstExponent}}\\times ${base}^{${secondExponent}}$.`,
    expected: `${base}^${firstExponent + secondExponent}`,
    explanation: "$a^p\\times a^q=a^{p+q}$.",
    insight: "La base reste inchangée ; seuls les exposants s'additionnent.",
    courseHintIds: ["elementary-power-rules"],
  };
}

export const advancedPowersExample = {
  id: "puissances-exemple-avance",
  categoryId: "calcul-elementaire",
  title: { fr: "Puissances — exemple avancé" },
  description: { fr: "Exemple complet à adapter." },
  difficulties: [
    { id: "starter", label: { fr: "Découverte" } },
    { id: "advanced", label: { fr: "Avancé" } },
  ],
  defaultDifficulty: "starter",
  source: { type: "generator", generate: generatePowerQuestion },
  answer: { type: "expression" },
  series: { questionCount: 10, choices: [5, 10, 20] },
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: { starter: 15, advanced: 25 },
    strict: false,
  },
  score: true,
  feedback: {
    showCorrection: true,
    showExplanation: true,
    showInsight: true,
    showCourseHintOnError: true,
  },
};

export default advancedPowersExample;
