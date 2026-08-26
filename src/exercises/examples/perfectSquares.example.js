// EXEMPLE MINIMAL — à copier dans definitions/elementary.js.
// Seules les valeurs commentées « À MODIFIER » changent pour un nouvel outil semblable.

import { randomInteger } from "../core/random";

export const perfectSquaresExample = {
  id: "carres-parfaits", // À MODIFIER : identifiant court, sans espace ni accent.
  categoryId: "calcul-elementaire",
  title: { fr: "Carrés parfaits", en: "Perfect squares" }, // À MODIFIER.
  description: { fr: "Mémoriser les carrés usuels." }, // À MODIFIER.

  source: {
    type: "generator",
    generate: ({ rng }) => {
      const n = randomInteger(2, 20, rng); // À MODIFIER : bornes des données.

      // QUESTION → RÉPONSE → CORRECTION.
      return {
        prompt: `Calculer $${n}^2$.`, // Ce que voit l'étudiant.
        expected: n * n, // Valeur utilisée par le validateur.
        explanation: `$${n}^2=${n}\\times ${n}=${n * n}$.`, // Après validation.
      };
    },
  },

  answer: { type: "integer" }, // À MODIFIER si la réponse n'est pas un entier.
  series: { questionCount: 10, choices: [5, 10, 20] },
  score: true,
  feedback: { showCorrection: true, showExplanation: true },
};

export default perfectSquaresExample;
