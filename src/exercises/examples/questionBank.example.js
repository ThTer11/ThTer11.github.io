// EXEMPLE DE BANQUE INTERACTIVE.
export const simpleQuestionBankExample = {
  id: "identites-banque-exemple",
  categoryId: "calcul-elementaire",
  title: { fr: "Identités — banque d'exemple" },
  description: { fr: "Questions écrites manuellement." },
  source: {
    type: "bank",
    questions: [
      {
        difficulty: "classic",
        prompt: "Développer $(x+2)^2$.",
        expected: "x^2+4x+4",
        explanation: "$(a+b)^2=a^2+2ab+b^2$.",
      },
      {
        difficulty: "classic",
        prompt: "Factoriser $x^2-25$.",
        expected: "(x-5)(x+5)",
        answer: { type: "expression", requiredForm: "factorized" },
        explanation: "$x^2-25=x^2-5^2$.",
      },
    ],
  },
  difficulties: [{ id: "classic", label: { fr: "Classiques" } }],
  answer: { type: "expression" },
};

// EXEMPLE DE BANQUE EN MODE EXERCICES CORRIGÉS.
export const workedQuestionBankExample = {
  id: "identites-corrigees-exemple",
  categoryId: "calcul-elementaire",
  mode: "study",
  title: { fr: "Identités corrigées — exemple" },
  description: { fr: "Indices progressifs et solution complète." },
  source: {
    type: "bank",
    questions: [
      {
        statement: "Factoriser $4x^2-12x+9$.",
        hints: [
          "Comparer avec $(a-b)^2$.",
          "Ici $a=2x$ et $b=3$.",
        ],
        solution: "$4x^2-12x+9=(2x)^2-2\\times 2x\\times 3+3^2=(2x-3)^2$.",
        insight: "Reconnaître l'identité évite de chercher les racines.",
        courseHintIds: ["elementary-notable-identities"],
      },
    ],
  },
};
