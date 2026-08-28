import { pickRandom, randomInteger, weightedPick } from "../core/random";
import { validateAnswer } from "../core/validators";
import {
  arePolynomialExpressionsEquivalent,
  hasDevelopedForm,
} from "../math/polynomial";
import { Fraction } from "../math/rational";
import {
  areCoprime,
  hasExplicitFactorizedForm,
  inspectPowerAnswer,
  inspectSquareRootAnswer,
  squareRootToLatex,
  squareRootToText,
} from "../math/elementary";

const translated = (fr, en) => ({ fr, en: en ?? fr });

// Présentation compacte des consignes, configurable entièrement depuis ce fichier.
// Icônes : "calculator", "scale", "pencil", "sparkles", false, ou un emoji.
const elementaryPromptUi = {
  calculate: {
    label: translated("Calculer", "Calculate"),
    detail: false,
    tone: "calculate",
    icon: "calculator",
  },
  reduceFraction: {
    label: translated("Réduire", "Reduce"),
    detail: translated("Donner une fraction irréductible.", "Give a fraction in lowest terms."),
    tone: "complete",
    icon: "pencil",
  },
  calculateFraction: {
    label: translated("Calculer", "Calculate"),
    detail: translated("Donner une fraction irréductible.", "Give a fraction in lowest terms."),
    tone: "calculate",
    icon: "calculator",
  },
  compareFractions: {
    label: translated("Comparer", "Compare"),
    detail: translated(
      "Utiliser $>$, $=$ ou $<$.",
      "Use $>$, $=$ or $<$.",
    ),
    tone: "decision",
    icon: "scale",
  },
  identifyIdentity: {
    label: translated("Vrai/Faux", "True/False"),
    detail: translated(
      "L'expression est une identité remarquable avec un facteur commun si nécessaire.",
      "The expression is a standard identity with a common factor if needed.",
    ),
    tone: "decision",
    icon: "scale",
    mobileLayout: "stack",
  },
  factorIdentity: {
    label: translated("Factoriser", "Factor"),
    detail: false,
    tone: "transform",
    icon: "pencil",
  },
  completeFactorIdentity: {
    label: translated("Complèter", "Complete"),
    detail: false,
    tone: "transform",
    icon: "pencil",
  },
  developIdentity: {
    label: translated("Développer", "Expand"),
    detail: false,
    tone: "complete",
    icon: "pencil",
  },
  completeDevelopmentIdentity: {
    label: translated("Compléter", "Complete"),
    detail: false,
    tone: "complete",
    icon: "pencil",
  },
  identityReview: {
    label: translated("Vrai/Faux", "True/False"),
    detail: translated(
      "L'expression est une identité remarquable avec un facteur commun si nécessaire.",
      "The expression is a standard identity with a common factor if needed.",
    ),
    tone: "default",
    icon: "scale",
    mobileLayout: "stack",
  },
};

const elementaryAudience = translated(
  "Automatismes du collège et du lycée",
  "Core secondary school skills",
);

const standardSeries = {
  questionCount: 10,
  choices: [5, 10, 15, 20],
  allowQuestionCount: true,
};

const standardFeedback = {
  showCorrection: true,
  showExplanation: false,
  showInsight: false,
  showCourseHintOnError: false,
  nextQuestion: true,
};



//##################################################################
// Les fonctions de bases
//##################################################################

function currentDifficulty(difficulty, fallback) {
  return typeof difficulty === "object"
    ? difficulty?.id ?? fallback
    : difficulty ?? fallback;
}

function randomNonZero(min, max, rng) {
  let value = 0;

  while (value === 0) {
    value = randomInteger(min, max, rng);
  }

  return value;
}

function signedSumLatex(values) {
  return values.map((value, index) => {
    if (index === 0) {
      return String(value);
    }

    return value < 0 ? `- ${Math.abs(value)}` : `+ ${value}`;
  }).join(" ");
}

function polynomial(terms, latex = false) {
  const visibleTerms = terms.filter(({ coefficient }) => coefficient !== 0);

  if (visibleTerms.length === 0) {
    return "0";
  }

  return visibleTerms.map(({ coefficient, variable }, index) => {
    const negative = coefficient < 0;
    const absolute = Math.abs(coefficient);
    const sign = index === 0
      ? negative ? "-" : ""
      : negative ? " - " : " + ";
    const coefficientText = variable && absolute === 1 ? "" : String(absolute);
    const product = !latex && variable && coefficientText ? "*" : "";

    return `${sign}${coefficientText}${product}${variable ?? ""}`;
  }).join("");
}

function linearExpression(coefficient, constant, latex = false) {
  return polynomial([
    { coefficient, variable: "x" },
    { coefficient: constant, variable: "" },
  ], latex);
}

function quadraticExpression(a, b, c, latex = false) {
  return polynomial([
    { coefficient: a, variable: "x^2" },
    { coefficient: b, variable: "x" },
    { coefficient: c, variable: "" },
  ], latex);
}

function fractionLatex(numerator, denominator) {
  return `\\frac{${numerator}}{${denominator}}`;
}

function exactFractionValidator(rawValue, context) {
  const { expected, question, lang } = context;

  if (question.answerKind !== "comparison") {
    return validateAnswer(
      rawValue,
      question.answerSpec ?? { type: "fraction", allowDecimal: false, requireReduced: true },
      expected,
      question,
      lang,
    );
  }

  const normalized = String(rawValue ?? "")
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/\\lt/g, "<")
    .replace(/\\gt/g, ">")
    .replace(/\\leq?/g, "≤")
    .replace(/\\geq?/g, "≥");
  const aliases = {
    "<": ["<", "inférieur", "inferieur", "plus petit"],
    "=": ["=", "égal", "egal", "égaux", "egaux"],
    ">": [">", "supérieur", "superieur", "plus grand"],
  };
  const correct = aliases[expected]?.includes(normalized) ?? false;

  return {
    correct,
    status: correct ? "correct" : "incorrect",
    message: correct
      ? (lang === "en" ? "Correct answer." : "Bonne réponse.")
      : (lang === "en" ? "Compare the cross-products." : "Compare les produits en croix."),
  };
}

function polynomialFormValidator(rawValue, { expected, question, lang }) {
  try {
    const alternatives = Array.isArray(expected) ? expected : [expected];
    const equivalent = alternatives.some((candidate) =>
      arePolynomialExpressionsEquivalent(rawValue, candidate));

    if (!equivalent) {
      return {
        correct: false,
        status: "incorrect",
        message: lang === "en"
          ? "The expression is not equivalent to the expected one."
          : "L'expression n'est pas équivalente à celle attendue.",
      };
    }

    const formOk = question.answerForm === "factorized"
      ? hasExplicitFactorizedForm(rawValue)
      : question.answerForm === "developed"
        ? hasDevelopedForm(rawValue)
        : true;

    if (!formOk) {
      return {
        correct: false,
        equivalent: true,
        formOk: false,
        status: "equivalent",
        message: lang === "en"
          ? `The value is right, but a ${question.answerForm} form is required.`
          : question.answerForm === "factorized"
            ? "L'expression est la même, mais la forme factorisée est demandée."
            : "L'expression est la même, mais la forme développée est demandée.",
      };
    }

    return {
      correct: true,
      equivalent: true,
      formOk: true,
      status: "correct",
      message: lang === "en" ? "Correct answer." : "Bonne réponse.",
    };
  } catch (error) {
    return {
      correct: false,
      status: "invalid",
      message: error.message,
    };
  }
}

function squareRootValidator(rawValue, { expected, question, lang }) {
  try {
    const result = inspectSquareRootAnswer(rawValue, expected);

    if (!result.equivalent) {
      return {
        correct: false,
        status: "incorrect",
        message: lang === "en" ? "This is not the expected exact value." : "Ce n'est pas la valeur exacte attendue.",
      };
    }

    if (question.requireSimplified !== false && !result.formOk) {
      return {
        correct: false,
        equivalent: true,
        formOk: false,
        status: "equivalent",
        message: lang === "en"
          ? "The value is right, but the square root can still be simplified."
          : "La valeur est correcte, mais la racine peut encore être simplifiée.",
      };
    }

    return {
      correct: true,
      equivalent: true,
      formOk: true,
      status: "correct",
      message: lang === "en" ? "Correct answer." : "Bonne réponse.",
    };
  } catch (error) {
    return { correct: false, status: "invalid", message: error.message };
  }
}

function powerValidator(rawValue, { expected, lang }) {
  try {
    const result = inspectPowerAnswer(rawValue, expected);

    if (!result.equivalent) {
      return {
        correct: false,
        status: "incorrect",
        message: lang === "en"
          ? "Check the base and the operation on the exponents."
          : "Vérifie la base et l'opération effectuée sur les exposants.",
      };
    }

    if (!result.formOk) {
      return {
        correct: false,
        equivalent: true,
        formOk: false,
        status: "equivalent",
        message: lang === "en"
          ? "The value is equivalent, but use one power and no negative exponent."
          : "La valeur est équivalente, mais écris une seule puissance sans exposant négatif.",
      };
    }

    return {
      correct: true,
      equivalent: true,
      formOk: true,
      status: "correct",
      message: lang === "en" ? "Correct answer." : "Bonne réponse.",
    };
  } catch (error) {
    return { correct: false, status: "invalid", message: error.message };
  }
}





//##################################################################
// Les différents entraînements
//##################################################################


//##################################################################
// Additions
//##################################################################


const additionsTool = {
  id: "sommes-rapides",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Sommes rapides", "Quick sums"),
  description: translated(
    "Entraînez-vous au calcul mental en réalisant des sommes simples le plus rapidement possible.",
    "Build your mental arithmetic skills by solving quick addition problems against the clock.",
  ),
  audience: elementaryAudience,
  exercises: [
    {
      id: "addition",
      color: "sky",
      timer: true,
      levels: [1, 2, 3],
      defaultLevel: 1,
      label: translated("Addition d'entiers", "Addition of integers"),
      description: translated("Somme de nombres entre 1 et 99.", "Sum of integers from 1 to 99."),
      promptUi: elementaryPromptUi.calculate,
    },
    { id: "subtraction", color: "violet", timer: true, levels: [1, 2, 3], defaultLevel: 1, label: translated("Soustraction d'entiers", "Subtraction of integers"), description: translated("Somme de deux entiers entre -99 et 99.", "Sum of two integers from -99 to 99."), promptUi: elementaryPromptUi.calculate },
    { id: "sum-three-terms", color: "emerald", timer: true, levels: [1, 2, 3], defaultLevel: 1, label: translated("Somme de trois termes", "Sum of three terms"), description: translated("Somme de trois entiers entre -99 et 99.", "Sum of three numbers from -99 to 99."), promptUi: elementaryPromptUi.calculate },
    { id: "difficult", color: "gold", timer: true, label: translated("Bilan", "Review"), description: translated("Tous les exercices au niveau maximal.", "All exercises at maximum difficulty."), promptUi: elementaryPromptUi.calculate },
  ],
  defaultDifficulty: "addition",
  series: standardSeries,
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: {
      addition: { 1: 5, 2: 7, 3: 7 },
      subtraction: { 1: 7, 2: 7, 3: 10 },
      "sum-three-terms": { 1: 15, 2: 20, 3: 25 },
      difficult: 25,
    },
    strict: true,
    show: true,
  },
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, level, rng }) => additionQuestion(difficulty, rng, level),
  },
  courseHintIds: [],
  answer: { type: "integer", inputMode: "numeric" },
  feedback: standardFeedback,
};


function additionQuestion(difficulty, rng, exerciseLevel = null) {
  const lvl = currentDifficulty(difficulty, "small");
  const level = Number(exerciseLevel ?? 1);
  const random_range_minimum_neg = level === 1 ? -20 : level === 2 ? -50 : level === 3 ? -99 : -99;
  const random_range_minimum = level === 1 ? 1 : level === 2 ? 11 : level === 3 ? 11 : 11;
  const random_range_maximum = level === 1 ? 20 : level === 2 ? 50 : level === 3 ? 99 : 99;
  const variants = {
    addition: [
      {
        weight: 1,
        make: () => [randomInteger(random_range_minimum, random_range_maximum, rng), randomInteger(random_range_minimum, random_range_maximum, rng)],
      },
    ],



    "subtraction": [
      {
        weight: 1,
        make: () => [randomInteger(random_range_minimum_neg, random_range_maximum, rng), randomInteger(random_range_minimum_neg, random_range_maximum, rng)],
      },
    ],



    "sum-three-terms": [
      {
        weight: 1,
        make: () => [
          randomInteger(random_range_minimum_neg, random_range_maximum, rng),
          randomInteger(random_range_minimum_neg, random_range_maximum, rng),
          randomInteger(random_range_minimum_neg, random_range_maximum, rng),
        ],
      },
    ],




    difficult: [
      {
        weight: 2,
        make: () => [randomInteger(40, 99, rng), randomInteger(40, 99, rng)],
      },
      {
        weight: 2,
        make: () => [
          randomInteger(-80, 99, rng),
          randomInteger(-80, 99, rng),
          randomInteger(-30, 60, rng),
        ],
      },
      {
        weight: 1,
        make: () => {
          const first = randomInteger(11, 60, rng);
          return [first, 100 - first, randomInteger(-25, 75, rng)];
        },
        strategy: true,
      },
    ],
  };
  const variant = weightedPick(variants[lvl] ?? variants.addition, rng);
  const values = variant.make();
  const expected = values.reduce((sum, value) => sum + value, 0);
  const expression = signedSumLatex(values);
  const compensation = values.length >= 2
    ? Math.round(values[1] / 10) * 10 - values[1]
    : 0;
  const usefulCompensation = compensation !== 0 && Math.abs(compensation) <= 2;

  return {
    prompt: translated(`Calculer : $$${expression}$$`, `Calculate: $$${expression}$$`),
    expected,
    answerDisplay: `$$${expected}$$`,
    explanation: translated(
      `En regroupant soigneusement les unités, on obtient $$${expression}=${expected}.$$`,
      `Grouping the units carefully gives $$${expression}=${expected}.$$`,
    ),
    insight: variant.strategy || usefulCompensation
      ? translated(
        "On peut déplacer une petite quantité d'un terme à l'autre pour faire apparaître une dizaine ou une centaine.",
        "Move a small amount from one term to another to create a multiple of ten or one hundred.",
      )
      : undefined,
    courseHintIds: [],
  };
}






//##################################################################
// Multiplications
//##################################################################

const multiplicationsTool = {
  id: "multiplications-rapides",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Multiplications rapides", "Quick multiplication"),
  description: translated(
    "Entraînez-vous au calcul mental en réalisant des multiplications simples le plus rapidement possible.",
    "Build your mental arithmetic skills by solving quick multiplication problems against the clock.",
  ),
  audience: elementaryAudience,
  exercises: [
    { id: "tables", color: "sky", timer: true, label: translated("Tables de multiplications", "Times tables"), description: translated("Produits d'entiers relatifs de $-10$ à $10$.", "Products of signed integers from $-10$ to $10$ in absolute value."), promptUi: elementaryPromptUi.calculate },
    { id: "simple", color: "violet", timer: true, levels: [1, 2, 3], defaultLevel: 1, label: translated("Produits simples", "Simple products"), description: translated("Produit d'un entier relatif à deux chiffres par un autre entier relatif.", "Product of a signed two-digit integer times another signed integer."), promptUi: elementaryPromptUi.calculate },
    { id: "mixed", color: "red", timer: true, label: translated("Défi", "Challenge"), description: translated("Multiplications d'entiers entre -99 et 99.", "Multiplication of integers from -99 to 99."), promptUi: elementaryPromptUi.calculate },
  ],
  defaultDifficulty: "tables",
  series: standardSeries,
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: {
      tables: 4,
      simple: { 1: 10, 2: 15, 3: 20 },
      mixed: 25,
    },
    strict: true,
    show: true,
  },
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, level, rng }) => multiplicationQuestion(difficulty, rng, level),
  },
  courseHintIds: [],
  answer: { type: "integer", inputMode: "numeric" },
  feedback: {showCorrection: true,
  showExplanation: false,
  showInsight: false,
  showCourseHintOnError: false,
  nextQuestion: true,},
};



function multiplicationQuestion(difficulty, rng, exerciseLevel = null) {
  const difficultyId = currentDifficulty(difficulty, "tables");
  const selectedLevel = Math.min(3, Math.max(1, Number(exerciseLevel) || 1));

  const simpleRanges = {
    1: { left: [11, 35], right: [2, 5] },
    2: { left: [11, 59], right: [2, 9] },
    3: { left: [11, 99], right: [2, 15] },
  };

  const generatedMode = difficultyId === "mixed"
    ? "mixed"
    : difficultyId;

  const effectiveLevel = selectedLevel;

  const ranges = generatedMode === "mixed"
    ? { left: [11, 99], right: [11, 99] }
    : generatedMode === "tables"
      ? { left: [2, 10], right: [2, 10] }
      : simpleRanges[effectiveLevel];

  const absoluteLeft = randomInteger(ranges.left[0], ranges.left[1], rng);
  const absoluteRight = randomInteger(ranges.right[0], ranges.right[1], rng);

  const signPattern = randomInteger(0, 3, rng);
  const left = signPattern % 2 === 1 ? -absoluteLeft : absoluteLeft;
  const right = signPattern >= 2 ? -absoluteRight : absoluteRight;

  const expected = left * right;

  const expression = `${left}\\times ${right < 0 ? `\\left(${right}\\right)` : right}`;

  const variant = difficultyId === "mixed"
    ? "mixed"
    : generatedMode === "simple"
      ? `simple-level-${effectiveLevel}`
      : "tables";

  return {
    variant,
    operands: [left, right],
    level: generatedMode === "simple" ? effectiveLevel : null,
    prompt: translated(
      `Calculer : $$${expression}$$`,
      `Calculate : $$${expression}$$`
    ),
    expected,
    answerDisplay: `$$${expected}$$`,
    explanation: translated(
      `Le produit exact est $$${expression}=${expected}.$$`,
      `The exact product is $$${expression}=${expected}.$$`,
    ),
    insight: translated(
      "Deux facteurs de même signe donnent un produit positif ; deux facteurs de signes contraires donnent un produit négatif.",
      "Factors with the same sign give a positive product; factors with different signs give a negative product.",
    ),
    courseHintIds: ["elementary-multiplication-strategies"],
  };
}






//##################################################################
// Fractions
//##################################################################


const fractionsTool = {
  id: "fractions-exactes",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Fractions", "Fractions"),
  description: translated(
    "Simplifier, comparer, calculer des sommes et des produits de fractions.",
    "Simplify, compare, and compute sums and products of fractions.",
  ),
  audience: elementaryAudience,
  exercises: [
    { id: "basics", color: "sky", levels: [1, 2, 3], defaultLevel: 1, label: translated("Bases", "Basics"), description: translated("Mise de fractions sous forme irréductible.", "Reduction of fractions."), promptUi: elementaryPromptUi.reduceFraction },
    { id: "sum", color: "violet", levels: [1, 2, 3], defaultLevel: 1, label: translated("Somme", "Sum"), description: translated("Somme de fractions.", "Sum of fractions."), promptUi: elementaryPromptUi.calculateFraction },
    { id: "prod", color: "emerald", levels: [1, 2, 3], defaultLevel: 1, label: translated("Produit", "Product"), description: translated("Produit de fractions.", "Product of fractions."), promptUi: elementaryPromptUi.calculateFraction },
    { id: "comparison", color: "rose", levels: [1, 2, 3], defaultLevel: 1, label: translated("Comparaison", "Comparison"), description: translated("Comparer sans approximation décimale.", "Compare without decimal approximations."), promptUi: elementaryPromptUi.compareFractions },
    { id: "mixed", color: "gold", timer: false, label: translated("Bilan", "Review"), description: translated("Tous les exercices au niveau maximal.", "All exercises at maximum difficulty."), promptUi: elementaryPromptUi.calculateFraction },
  ],
  defaultDifficulty: "basics",
  series: standardSeries,
  timer: {
    enabled: false,
  },
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, rng, level}) => fractionQuestion(difficulty, rng, level),
  },
  courseHintIds: [""],
  answer: {
    type: "text",
    placeholder: translated("ex. 1/2 ou <", "ex. 1/2 or <"),
    validator: exactFractionValidator,
  },
  feedback: {showCorrection: true,
  showExplanation: false,
  showInsight: false,
  showCourseHintOnError: false,
  nextQuestion: true,},
};


function gcdNumber(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}


function shouldUseNegativeDenominator(rng, chance) {
  return randomInteger(1, 100, rng) <= chance * 100;
}


function shouldUseNegativeNumerator(rng, chance = 0.1) {
  return randomInteger(1, 100, rng) <= chance * 100;
}


function applyNumeratorSign(numerator, rng, chance = 0.1) {
  return shouldUseNegativeNumerator(rng, chance)
    ? -Math.abs(numerator)
    : numerator;
}


function applyDenominatorSign(denominator, rng, chance) {
  return shouldUseNegativeDenominator(rng, chance)
    ? -Math.abs(denominator)
    : Math.abs(denominator);
}

function normalizedFractionParts(fraction) {
  if (fraction.denominator < 0) {
    return {
      numerator: -fraction.numerator,
      denominator: -fraction.denominator,
    };
  }

  return {
    numerator: fraction.numerator,
    denominator: fraction.denominator,
  };
}


function compareFractionParts(left, right) {
  const normalizedLeft = normalizedFractionParts(left);
  const normalizedRight = normalizedFractionParts(right);

  const crossLeft =
    normalizedLeft.numerator * normalizedRight.denominator;

  const crossRight =
    normalizedRight.numerator * normalizedLeft.denominator;

  if (crossLeft < crossRight) {
    return -1;
  }

  if (crossLeft > crossRight) {
    return 1;
  }

  return 0;
}


function randomReducedFraction(
  rng,
  {
    minDenominator = 2,
    maxDenominator = 12,
    maxNumerator = null,
    proper = true,
    negativeDenominatorChance = 0,
  } = {},
) {
  let numerator;
  let absoluteDenominator;

  do {
    absoluteDenominator = randomInteger(
      minDenominator,
      maxDenominator,
      rng,
    );

    numerator = proper
      ? randomInteger(1, absoluteDenominator - 1, rng)
      : randomInteger(
          1,
          maxNumerator ?? maxDenominator,
          rng,
        );
  } while (!areCoprime(numerator, absoluteDenominator));

  const denominator = applyDenominatorSign(
    absoluteDenominator,
    rng,
    negativeDenominatorChance,
  );

  return {
    numerator,
    denominator,
    value: new Fraction(
      BigInt(numerator),
      BigInt(denominator),
    ),
  };
}


function fractionQuestion(
  difficulty,
  rng,
  exerciseLevel = null,
) {
  const difficultyId = currentDifficulty(
    difficulty,
    "basics",
  );

  const selectedLevel = Math.min(
    3,
    Math.max(1, Number(exerciseLevel) || 1),
  );

  const effectiveLevel =
    difficultyId === "mixed"
      ? 3
      : selectedLevel;

  const negativeDenominatorChance = {
    1: 0,
    2: 0.2,
    3: 0.35,
  }[effectiveLevel];


  const simplification = () => {
    let maxDenominator;
    let factors;

    if (effectiveLevel === 1) {
      maxDenominator = 10;
      factors = [2, 3, 5];
    } else if (effectiveLevel === 2) {
      maxDenominator = 15;
      factors = [4, 6, 7, 8, 9, 10];
    } else {
      maxDenominator = 20;
      factors = [6, 8, 9, 10, 12, 14, 15];
    }

    let numerator;
    let absoluteDenominator;

    do {
      absoluteDenominator = randomInteger(
        2,
        maxDenominator,
        rng,
      );

      numerator = randomInteger(
        1,
        absoluteDenominator - 1,
        rng,
      );
    } while (
      !areCoprime(numerator, absoluteDenominator)
    );

    const factor =
      factors[
        randomInteger(
          0,
          factors.length - 1,
          rng,
        )
      ];

    const denominator = applyDenominatorSign(
      absoluteDenominator,
      rng,
      negativeDenominatorChance,
    );

    numerator = applyNumeratorSign(numerator, rng);

    const shownNumerator =
      numerator * factor;

    const shownDenominator =
      denominator * factor;

    const expected = new Fraction(
      BigInt(shownNumerator),
      BigInt(shownDenominator),
    );

    return {
      variant: `simplify-level-${effectiveLevel}`,
      promptUi: elementaryPromptUi.reduceFraction,

      fraction: {
        numerator: shownNumerator,
        denominator: shownDenominator,
      },

      prompt: translated(
        `Donner sous forme irréductible : $$${fractionLatex(shownNumerator, shownDenominator)}$$`,
        `Write in lowest terms: $$${fractionLatex(shownNumerator, shownDenominator)}$$`,
      ),

      expected,

      answerDisplay:
        `$$${expected.toLatex()}$$`,

      answerSpec: {
        type: "fraction",
        allowDecimal: false,
        requireReduced: true,
      },

      explanation: translated(
        `On divise le numérateur et le dénominateur par ${factor} : $$${fractionLatex(shownNumerator, shownDenominator)}=${expected.toLatex()}.$$`,
        `Divide the numerator and denominator by ${factor}: $$${fractionLatex(shownNumerator, shownDenominator)}=${expected.toLatex()}.$$`,
      ),
    };
  };


  const sumOrDifference = (operator) => {
    let left;
    let right;

    if (effectiveLevel === 1) {
      const denominator = randomInteger(
        3,
        12,
        rng,
      );

      let leftNumerator;
      let rightNumerator;

      do {
        leftNumerator = randomInteger(
          1,
          denominator - 1,
          rng,
        );
      } while (
        !areCoprime(
          leftNumerator,
          denominator,
        )
      );

      do {
        rightNumerator = randomInteger(
          1,
          denominator - 1,
          rng,
        );
      } while (
        !areCoprime(
          rightNumerator,
          denominator,
        )
      );

      left = {
        numerator: leftNumerator,
        denominator,
      };

      right = {
        numerator: rightNumerator,
        denominator,
      };
    }

    else if (effectiveLevel === 2) {
      const smallDenominator =
        randomInteger(2, 8, rng);

      const factor =
        randomInteger(2, 4, rng);

      const largeDenominator =
        smallDenominator * factor;

      let leftNumerator;
      let rightNumerator;

      do {
        leftNumerator = randomInteger(
          1,
          smallDenominator - 1,
          rng,
        );
      } while (
        !areCoprime(
          leftNumerator,
          smallDenominator,
        )
      );

      do {
        rightNumerator = randomInteger(
          1,
          largeDenominator - 1,
          rng,
        );
      } while (
        !areCoprime(
          rightNumerator,
          largeDenominator,
        )
      );

      left = {
        numerator: leftNumerator,
        denominator: applyDenominatorSign(
          smallDenominator,
          rng,
          negativeDenominatorChance,
        ),
      };

      right = {
        numerator: rightNumerator,
        denominator: applyDenominatorSign(
          largeDenominator,
          rng,
          negativeDenominatorChance,
        ),
      };

      if (randomInteger(0, 1, rng) === 1) {
        [left, right] = [right, left];
      }
    }

    else {
      let absoluteLeftDenominator;
      let absoluteRightDenominator;

      do {
        left = randomReducedFraction(
          rng,
          {
            maxDenominator: 15,
            negativeDenominatorChance,
          },
        );

        right = randomReducedFraction(
          rng,
          {
            maxDenominator: 15,
            negativeDenominatorChance,
          },
        );

        absoluteLeftDenominator =
          Math.abs(left.denominator);

        absoluteRightDenominator =
          Math.abs(right.denominator);
      } while (
        absoluteLeftDenominator ===
          absoluteRightDenominator ||
        absoluteLeftDenominator %
          absoluteRightDenominator ===
          0 ||
        absoluteRightDenominator %
          absoluteLeftDenominator ===
          0
      );
    }


    left.numerator = applyNumeratorSign(
      left.numerator,
      rng,
    );

    right.numerator = applyNumeratorSign(
      right.numerator,
      rng,
    );


    left.value = new Fraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );

    right.value = new Fraction(
      BigInt(right.numerator),
      BigInt(right.denominator),
    );

    if (
      operator === "subtract" &&
      effectiveLevel < 3 &&
      compareFractionParts(left, right) < 0
    ) {
      [left, right] = [right, left];
    }


    const symbol =
      operator === "add"
        ? "+"
        : "-";

    const expected =
      operator === "add"
        ? left.value.add(right.value)
        : left.value.sub(right.value);

    const expression =
      `${fractionLatex(
        left.numerator,
        left.denominator,
      )}`
      + ` ${symbol} `
      + `${fractionLatex(
        right.numerator,
        right.denominator,
      )}`;

    return {
      variant:
        `${operator}-level-${effectiveLevel}`,
      promptUi: elementaryPromptUi.calculateFraction,

      fractions: {
        left: {
          numerator: left.numerator,
          denominator: left.denominator,
        },
        right: {
          numerator: right.numerator,
          denominator: right.denominator,
        },
      },

      prompt: translated(
        `Calculer et mettre sous forme irréductible : $$${expression}$$`,
        `Compute and write in lowest terms: $$${expression}$$`,
      ),

      expected,

      answerDisplay:
        `$$${expected.toLatex()}$$`,

      answerSpec: {
        type: "fraction",
        allowDecimal: false,
        requireReduced: true,
      },

      explanation: translated(
        `On met les fractions au même dénominateur, puis on réduit le résultat : $$${expression}=${expected.toLatex()}.$$`,
        `Put the fractions over a common denominator, then reduce the result: $$${expression}=${expected.toLatex()}.$$`,
      ),
    };
  };

  const productOrQuotient = (operator) => {
    let left;
    let right;

    if (effectiveLevel === 1) {
      left = randomReducedFraction(
        rng,
        {
          maxDenominator: 8,
        },
      );

      right = randomReducedFraction(
        rng,
        {
          maxDenominator: 8,
        },
      );
    }

    else if (effectiveLevel === 2) {
      let attempts = 0;

      do {
        left = randomReducedFraction(
          rng,
          {
            maxDenominator: 12,
            negativeDenominatorChance,
          },
        );

        right = randomReducedFraction(
          rng,
          {
            maxDenominator: 12,
            negativeDenominatorChance,
          },
        );

        attempts += 1;

        if (attempts > 100) {
          break;
        }
      } while (
        operator === "multiply"
          ? (
              gcdNumber(
                left.numerator,
                Math.abs(right.denominator),
              ) === 1 &&
              gcdNumber(
                right.numerator,
                Math.abs(left.denominator),
              ) === 1
            )
          : (
              gcdNumber(
                left.numerator,
                right.numerator,
              ) === 1 &&
              gcdNumber(
                Math.abs(left.denominator),
                Math.abs(right.denominator),
              ) === 1
            )
      );
    }

    else {
      left = randomReducedFraction(
        rng,
        {
          maxDenominator: 15,
          maxNumerator: 20,
          proper: false,
          negativeDenominatorChance,
        },
      );

      right = randomReducedFraction(
        rng,
        {
          maxDenominator: 15,
          maxNumerator: 20,
          proper: false,
          negativeDenominatorChance,
        },
      );
    }


    left.numerator = applyNumeratorSign(
      left.numerator,
      rng,
    );

    right.numerator = applyNumeratorSign(
      right.numerator,
      rng,
    );

    left.value = new Fraction(
      BigInt(left.numerator),
      BigInt(left.denominator),
    );

    right.value = new Fraction(
      BigInt(right.numerator),
      BigInt(right.denominator),
    );


    const isDivision =
      operator === "divide";

    const symbol =
      isDivision
        ? "\\div"
        : "\\times";

    const expected =
      isDivision
        ? left.value.div(right.value)
        : left.value.mul(right.value);

    const expression =
      `${fractionLatex(
        left.numerator,
        left.denominator,
      )}`
      + ` ${symbol} `
      + `${fractionLatex(
        right.numerator,
        right.denominator,
      )}`;

    return {
      variant:
        `${operator}-level-${effectiveLevel}`,
      promptUi: elementaryPromptUi.calculateFraction,

      fractions: {
        left: {
          numerator: left.numerator,
          denominator: left.denominator,
        },
        right: {
          numerator: right.numerator,
          denominator: right.denominator,
        },
      },

      prompt: translated(
        `Calculer et mettre sous forme irréductible : $$${expression}$$`,
        `Compute and write in lowest terms: $$${expression}$$`,
      ),

      expected,

      answerDisplay:
        `$$${expected.toLatex()}$$`,

      answerSpec: {
        type: "fraction",
        allowDecimal: false,
        requireReduced: true,
      },

      explanation: isDivision
        ? translated(
            `On transforme la division en multiplication par l'inverse de la seconde fraction, puis on simplifie : $$${expression}=${expected.toLatex()}.$$`,
            `Replace the division with multiplication by the reciprocal of the second fraction, then simplify: $$${expression}=${expected.toLatex()}.$$`,
          )
        : translated(
            `On multiplie les numérateurs entre eux et les dénominateurs entre eux, en simplifiant lorsque c'est possible : $$${expression}=${expected.toLatex()}.$$`,
            `Multiply the numerators and denominators, simplifying whenever possible: $$${expression}=${expected.toLatex()}.$$`,
          ),
    };
  };

  const comparison = () => {
    let left;
    let right;

    if (effectiveLevel === 1) {
      const equivalentPair =
        randomInteger(0, 4, rng) === 0;

      if (equivalentPair) {
        const denominator =
          randomInteger(3, 8, rng);
        const numerator =
          randomInteger(1, denominator - 1, rng);
        const factor =
          randomInteger(2, 4, rng);

        left = { numerator, denominator };
        right = {
          numerator: numerator * factor,
          denominator: denominator * factor,
        };
      } else {
        const denominator =
          randomInteger(3, 12, rng);
        const leftNumerator =
          randomInteger(1, denominator - 1, rng);
        const offset =
          randomInteger(1, denominator - 2, rng);
        const rightNumerator =
          ((leftNumerator - 1 + offset)
            % (denominator - 1)) + 1;

        left = {
          numerator: leftNumerator,
          denominator,
        };
        right = {
          numerator: rightNumerator,
          denominator,
        };
      }

      if (randomInteger(0, 1, rng) === 1) {
        [left, right] = [right, left];
      }
    }

    else if (effectiveLevel === 2) {
      const denominator =
        randomInteger(2, 8, rng);

      const factor =
        randomInteger(2, 4, rng);

      const leftDenominator =
        applyDenominatorSign(
          denominator,
          rng,
          negativeDenominatorChance,
        );

      left = {
        numerator: randomInteger(
          1,
          denominator - 1,
          rng,
        ),
        denominator: leftDenominator,
      };

      if (
        randomInteger(0, 5, rng) === 0
      ) {
        const signMultiplier =
          left.denominator < 0
            ? -1
            : 1;

        right = {
          numerator:
            left.numerator * factor,

          denominator:
            Math.abs(denominator * factor)
            * signMultiplier,
        };
      } else {
        right = {
          numerator: randomInteger(
            1,
            denominator * factor - 1,
            rng,
          ),

          denominator:
            applyDenominatorSign(
              denominator * factor,
              rng,
              negativeDenominatorChance,
            ),
        };
      }


      if (
        randomInteger(0, 1, rng) === 1
      ) {
        [left, right] = [right, left];
      }
    }

    else {
      left = randomReducedFraction(
        rng,
        {
          maxDenominator: 18,
          negativeDenominatorChance,
        },
      );

      right = randomReducedFraction(
        rng,
        {
          maxDenominator: 18,
          negativeDenominatorChance,
        },
      );

      if (
        randomInteger(0, 5, rng) === 0
      ) {
        const factor =
          randomInteger(2, 5, rng);

        right = {
          numerator:
            left.numerator * factor,

          denominator:
            left.denominator * factor,
        };
      }
    }

    const equivalentBeforeNumeratorSigns =
      compareFractionParts(left, right) === 0;

    if (equivalentBeforeNumeratorSigns) {
      if (shouldUseNegativeNumerator(rng)) {
        left.numerator = -Math.abs(left.numerator);
        right.numerator = -Math.abs(right.numerator);
      }
    } else {
      if (shouldUseNegativeNumerator(rng)) {
        left.numerator = -Math.abs(left.numerator);
      }

      if (shouldUseNegativeNumerator(rng)) {
        right.numerator = -Math.abs(right.numerator);
      }
    }

    const normalizedLeft =
      normalizedFractionParts(left);

    const normalizedRight =
      normalizedFractionParts(right);

    const crossLeft =
      normalizedLeft.numerator
      * normalizedRight.denominator;

    const crossRight =
      normalizedRight.numerator
      * normalizedLeft.denominator;

    const expected =
      crossLeft < crossRight
        ? "<"
        : crossLeft > crossRight
          ? ">"
          : "=";


    return {
      variant:
        `compare-level-${effectiveLevel}`,
      promptUi: elementaryPromptUi.compareFractions,

      answerKind: "comparison",

      fractions: {
        left: {
          numerator: left.numerator,
          denominator: left.denominator,
        },
        right: {
          numerator: right.numerator,
          denominator: right.denominator,
        },
      },

      prompt: translated(
        `Compléter avec $<$, $=$ ou $>$ : $$${fractionLatex(left.numerator, left.denominator)}\\quad?\\quad${fractionLatex(right.numerator, right.denominator)}$$`,
        `Fill in with $<$, $=$ or $>$: $$${fractionLatex(left.numerator, left.denominator)}\\quad?\\quad${fractionLatex(right.numerator, right.denominator)}$$`,
      ),

      expected,

      answerDisplay:
        `$$${fractionLatex(
          left.numerator,
          left.denominator,
        )}`
        + ` ${expected} `
        + `${fractionLatex(
          right.numerator,
          right.denominator,
        )}$$`,

      explanation: translated(
        `Après avoir ramené les éventuels signes des dénominateurs aux numérateurs, les produits en croix sont ${crossLeft} et ${crossRight}. Le symbole correct est donc $${expected}$.`,
        `After moving any denominator signs to the numerators, the cross-products are ${crossLeft} and ${crossRight}. The correct symbol is therefore $${expected}$.`,
      ),
    };
  };

  const pools = {
    basics: [
      {
        weight: 1,
        make: simplification,
      },
    ],

    sum: [
      {
        weight: 1,
        make: () =>
          sumOrDifference("add"),
      },
      {
        weight: 1,
        make: () =>
          sumOrDifference("subtract"),
      },
    ],

    prod: [
      {
        weight: 1,
        make: () =>
          productOrQuotient("multiply"),
      },
      {
        weight: 1,
        make: () =>
          productOrQuotient("divide"),
      },
    ],

    comparison: [
      {
        weight: 1,
        make: comparison,
      },
    ],

    mixed: [
      {
        weight: 1,
        make: simplification,
      },
      {
        weight: 1,
        make: () =>
          sumOrDifference("add"),
      },
      {
        weight: 1,
        make: () =>
          sumOrDifference("subtract"),
      },
      {
        weight: 1,
        make: () =>
          productOrQuotient("multiply"),
      },
      {
        weight: 1,
        make: () =>
          productOrQuotient("divide"),
      },
      {
        weight: 1,
        make: comparison,
      },
    ],
  };


  const question = weightedPick(
    pools[difficultyId]
      ?? pools.basics,
    rng,
  ).make();


  return {
    courseHintIds: [
      "elementary-fractions",
    ],

    insight:
      question.variant.startsWith("divide")
        ? translated(
            "Diviser par une fraction revient à multiplier par son inverse.",
            "Dividing by a fraction means multiplying by its reciprocal.",
          )
        : undefined,

    ...question,
  };
}





//##################################################################
// Identités remarquables
//##################################################################


const identitiesTool = {
  id: "identites-remarquables",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Identités remarquables", "Standard identities"),
  description: translated(
    "Reconnaître, compléter, développer et factoriser les trois identités remarquables.",
    "Recognise, complete, expand and factor the three standard identities.",
  ),
  audience: elementaryAudience,
  exercises: [
    {
      id: "identify",
      color: "sky",
      levels: [1, 2, 3],
      defaultLevel: 1,
      label: translated("Identifier une identité remarquable", "Identify a standard identity"),
      description: translated("Reconnaître si l'expression peut être développée ou factorisée avec une identité remarquable.", "Decide whether the expression can be expanded or factorised using a standard identity."),
      promptUi: elementaryPromptUi.identifyIdentity,
    },
    { id: "recognize", color: "violet", levels: [1, 2, 3], defaultLevel: 1, label: translated("Factoriser", "Factor"), description: translated("Factoriser une expression littérale en utilisant une identité remarquable.", "Factor a literal expression using a standard identity."), promptUi: elementaryPromptUi.factorIdentity },
    { id: "use", color: "emerald", levels: [1, 2, 3], defaultLevel: 1, label: translated("Développer et utiliser", "Expand and apply"), description: translated("Développer une expression littérale en utilisant une identité remarquable.", "Expand a literal expression using a standard identity."), promptUi: elementaryPromptUi.developIdentity },
    { id: "mixed", color: "gold", label: translated("Bilan", "Review"), description: translated("Tous les exercices au niveau maximal.", "All exercises at maximum difficulty."), promptUi: elementaryPromptUi.identityReview },
  ],
  defaultExercise: "identify",
  series: standardSeries,
  timer: false,
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, level, rng }) => identityQuestion(difficulty, rng, level),
  },
  courseHintIds: ["elementary-identities"],
  answer: {
    type: "expression",
    placeholder: translated("ex. (x-4)^2", "e.g. (x-4)^2"),
    validator: polynomialFormValidator,
  },
  feedback: {showCorrection: true,
  showExplanation: false,
  showInsight: false,
  showCourseHintOnError: false,
  nextQuestion: true,},
};






const developmentTool = {
  id: "developpement-algebrique",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Développement", "Algebraic expansion"),
  description: translated(
    "Développer et réduire des expressions algébriques de difficulté progressive.",
    "Expand and collect algebraic expressions of increasing difficulty.",
  ),
  audience: elementaryAudience,
  difficulties: [
    { id: "single", label: translated("Distributivité simple", "Single distribution"), description: translated("Une constante devant une parenthèse.", "One constant before parentheses.") },
    { id: "double", label: translated("Double distributivité", "Double distribution"), description: translated("Produit de deux facteurs moniques.", "Product of two monic factors.") },
    { id: "coefficients", label: translated("Coefficients", "Coefficients"), description: translated("Deux facteurs avec coefficients et signes.", "Two factors with coefficients and signs.") },
    { id: "mixed", label: translated("Expressions mêlées", "Mixed expressions"), description: translated("Deux développements à réduire ensemble.", "Two expansions to combine.") },
  ],
  defaultDifficulty: "single",
  series: standardSeries,
  timer: false,
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, rng }) => developmentQuestion(difficulty, rng),
  },
  courseHintIds: ["elementary-distributivity"],
  answer: {
    type: "expression",
    requiredForm: "developed",
    placeholder: translated("ex. 3x^2-2x+1", "e.g. 3x^2-2x+1"),
    validator: polynomialFormValidator,
  },
  feedback: standardFeedback,
};

const factorizationTool = {
  id: "factorisation",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Factorisation", "Factorisation"),
  description: translated(
    "Mettre en évidence un facteur commun puis mobiliser les identités remarquables.",
    "Extract a common factor, then apply standard identities.",
  ),
  audience: elementaryAudience,
  difficulties: [
    { id: "common-factor", label: translated("Facteur commun", "Common factor"), description: translated("Extraire le facteur commun maximal.", "Extract the greatest common factor.") },
    { id: "identities", label: translated("Identités", "Identities"), description: translated("Carrés parfaits et différence de carrés.", "Perfect squares and difference of squares.") },
    { id: "combined", label: translated("Combinaisons", "Combined"), description: translated("Facteur commun puis identité remarquable.", "Common factor followed by an identity.") },
    { id: "mixed", label: translated("Mélange", "Mixed"), description: translated("Choisir soi-même la méthode adaptée.", "Choose the appropriate method yourself.") },
  ],
  defaultDifficulty: "common-factor",
  series: standardSeries,
  timer: false,
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, rng }) => factorizationQuestion(difficulty, rng),
  },
  courseHintIds: ["elementary-factorization", "elementary-identities"],
  answer: {
    type: "expression",
    requiredForm: "factorized",
    placeholder: translated("ex. 3(x-2)(x+2)", "e.g. 3(x-2)(x+2)"),
    validator: polynomialFormValidator,
  },
  feedback: standardFeedback,
};

const squareRootsTool = {
  id: "racines-carrees",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Racines carrées", "Square roots"),
  description: translated(
    "Connaître les racines carrées des carrés parfaits, simplifier des racines carrées et effectuer des produits ou quotients exacts.",
    "Recognise perfect squares, simplify roots and compute exact products or quotients.",
  ),
  audience: elementaryAudience,
  difficulties: [
    { id: "perfect-squares", label: translated("Carrés parfaits", "Perfect squares"), description: translated("Valeurs usuelles jusqu'à $20^2$.", "Common values up to $20^2$.") },
    { id: "simplify", label: translated("Simplification de racines", "Square root simplification"), description: translated("Extraire un facteur carré.", "Extract a square factor.") },
    { id: "operations", label: translated("Produits et quotients de racines", "Square root products and quotients"), description: translated("Utiliser les règles de calculs.", "Use rules for square roots.") },
    { id: "mixed", label: translated("Mélange", "Mixed"), description: translated("Toutes les variantes avec des nombres plus grands.", "All variants with larger numbers.") },
  ],
  defaultDifficulty: "perfect-squares",
  series: standardSeries,
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: { "perfect-squares": 5, simplify: 20, operations: 20, mixed: 25 },
    strict: false,
    show: true,
  },
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, rng }) => squareRootQuestion(difficulty, rng),
  },
  courseHintIds: ["elementary-square-roots"],
  answer: {
    type: "text",
    placeholder: translated("ex. 3sqrt(2)", "e.g. 3sqrt(2)"),
    validator: squareRootValidator,
  },
  feedback: standardFeedback,
};

const powersTool = {
  id: "puissances",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Puissances", "Powers"),
  description: translated(
    "Automatiser les règles de produit, quotient et puissance d'une puissance, y compris avec des exposants littéraux.",
    "Practise products, quotients and powers of powers, including symbolic exponents.",
  ),
  audience: elementaryAudience,
  difficulties: [
    { id: "products", label: translated("Produits", "Products"), description: translated("Additionner les exposants de même base.", "Add exponents with the same base.") },
    { id: "quotients", label: translated("Quotients", "Quotients"), description: translated("Soustraire ou multiplier les exposants.", "Subtract or multiply exponents.") },
    { id: "literal", label: translated("Exposants littéraux", "Symbolic exponents"), description: translated("Notamment $3^n\\times9$.", "Including $3^n\\times9$.") },
    { id: "advanced", label: translated("Mélange avancé", "Advanced mix"), description: translated("Formes littérales et exposants négatifs.", "Symbolic forms and negative exponents.") },
  ],
  defaultDifficulty: "products",
  series: standardSeries,
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: { products: 14, quotients: 18, literal: 22, advanced: 25 },
    strict: true,
    show: true,
  },
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, rng }) => powerQuestion(difficulty, rng),
  },
  courseHintIds: ["elementary-powers"],
  answer: {
    type: "text",
    placeholder: translated("ex. 3^(n+2)", "e.g. 3^(n+2)"),
    validator: powerValidator,
  },
  feedback: standardFeedback,
};

const linearEquationsTool = {
  id: "equations-premier-degre",
  categoryId: "calcul-elementaire",
  mode: "practice",
  title: translated("Équations du premier degré", "Linear equations"),
  description: translated(
    "Résoudre des équations linéaires, des formes immédiates aux équations avec parenthèses ou solution fractionnaire.",
    "Solve linear equations, from immediate forms to parentheses and fractional solutions.",
  ),
  audience: elementaryAudience,
  difficulties: [
    { id: "isolate", label: translated("Isoler $x$", "Isolate $x$"), description: translated("Une inconnue dans un seul membre.", "The unknown appears on one side.") },
    { id: "both-sides", label: translated("Deux membres", "Both sides"), description: translated("Des termes en $x$ dans les deux membres.", "$x$ terms on both sides.") },
    { id: "parentheses", label: translated("Parenthèses", "Parentheses"), description: translated("Développer avant de résoudre.", "Expand before solving.") },
    { id: "fractions", label: translated("Solutions fractionnaires", "Fractional solutions"), description: translated("Conserver une réponse exacte et réduite.", "Keep an exact reduced answer.") },
  ],
  defaultDifficulty: "isolate",
  series: standardSeries,
  timer: false,
  score: true,
  source: {
    type: "generator",
    generate: ({ difficulty, rng }) => linearEquationQuestion(difficulty, rng),
  },
  courseHintIds: ["elementary-linear-equations", "elementary-distributivity", "elementary-fractions"],
  answer: {
    type: "fraction",
    allowDecimal: false,
    requireReduced: true,
    placeholder: translated("valeur de x", "value of x"),
  },
  feedback: standardFeedback,
};

const guidedMethodsTool = {
  id: "methodes-calcul-elementaire",
  categoryId: "calcul-elementaire",
  mode: "study",
  title: translated("Méthodes guidées", "Guided methods"),
  description: translated(
    "Quelques exercices choisis à chercher sans chronomètre, avec indices progressifs et correction complète.",
    "A curated set of untimed problems with progressive hints and full solutions.",
  ),
  audience: elementaryAudience,
  difficulties: [
    { id: "mental", label: translated("Calcul mental", "Mental arithmetic") },
    { id: "algebra", label: translated("Calcul algébrique", "Algebra") },
  ],
  defaultDifficulty: "mental",
  series: {
    questionCount: 1,
    choices: [1],
    allowQuestionCount: false,
  },
  timer: false,
  score: false,
  source: {
    type: "bank",
    questions: [
      {
        id: "compensation-199",
        difficulty: "mental",
        statement: translated(
          "Calculer mentalement $$199+347-99.$$ Chercher une réorganisation qui évite les longues additions.",
          "Calculate mentally $$199+347-99.$$ Look for a rearrangement that avoids long addition.",
        ),
        prompt: translated("Calculer mentalement : $$199+347-99$$", "Calculate mentally: $$199+347-99$$"),
        expected: 447,
        hints: [
          translated("Regroupe $199$ et $-99$.", "Group $199$ and $-99$."),
          translated("Leur différence vaut exactement $100$.", "Their difference is exactly $100$."),
        ],
        solution: translated(
          "Par associativité, $$199+347-99=(199-99)+347=100+347=447.$$",
          "By associativity, $$199+347-99=(199-99)+347=100+347=447.$$",
        ),
        explanation: translated(
          "Par associativité, $$199+347-99=(199-99)+347=447.$$",
          "By associativity, $$199+347-99=(199-99)+347=447.$$",
        ),
        insight: translated("L'ordre des additions peut être choisi pour faire apparaître des nombres ronds.", "Reorder additions to create round numbers."),
        courseHintIds: ["elementary-addition-strategies"],
      },
      {
        id: "product-48-25",
        difficulty: "mental",
        statement: translated(
          "Calculer mentalement $$48\\times25$$ sans poser la multiplication.",
          "Calculate $$48\\times25$$ mentally, without long multiplication.",
        ),
        prompt: translated("Calculer mentalement : $$48\\times25$$", "Calculate mentally: $$48\\times25$$"),
        expected: 1200,
        hints: [
          translated("Écris $25=100/4$.", "Write $25=100/4$."),
          translated("Le nombre $48$ est divisible par $4$.", "$48$ is divisible by $4$."),
        ],
        solution: translated(
          "On utilise $25=100/4$ : $$48\\times25=\\frac{48}{4}\\times100=12\\times100=1200.$$",
          "Use $25=100/4$: $$48\\times25=\\frac{48}{4}\\times100=12\\times100=1200.$$",
        ),
        explanation: translated("La compensation transforme le calcul en $12\\times100$.", "The shortcut turns the product into $12\\times100$."),
        insight: translated("Cette stratégie fonctionne très bien quand le premier facteur est divisible par $4$.", "This strategy is especially useful when the first factor is divisible by $4$."),
        courseHintIds: ["elementary-multiplication-strategies"],
      },
      {
        id: "fraction-cancellation",
        difficulty: "mental",
        statement: translated(
          "Calculer exactement $$\\frac34-\\frac23\\times\\frac98.$$",
          "Compute exactly $$\\frac34-\\frac23\\times\\frac98.$$",
        ),
        prompt: translated("Calculer exactement : $$\\frac34-\\frac23\\times\\frac98$$", "Compute exactly: $$\\frac34-\\frac23\\times\\frac98$$"),
        expected: 0,
        hints: [
          translated("La multiplication est prioritaire.", "Multiplication comes first."),
          translated("Simplifie avant de multiplier : $\\frac23\\times\\frac98$.", "Cancel factors before multiplying $\\frac23\\times\\frac98$."),
        ],
        solution: translated(
          "On simplifie en croix : $$\\frac23\\times\\frac98=\\frac{2\\times9}{3\\times8}=\\frac34.$$ Ainsi, l'expression vaut $\\frac34-\\frac34=0$.",
          "Cancel common factors: $$\\frac23\\times\\frac98=\\frac{2\\times9}{3\\times8}=\\frac34.$$ Hence the expression is $\\frac34-\\frac34=0$.",
        ),
        explanation: translated("Les deux termes sont finalement égaux.", "The two terms are ultimately equal."),
        insight: translated("Simplifier avant de multiplier garde des nombres petits et limite les erreurs.", "Cancel before multiplying to keep numbers small and reduce errors."),
        courseHintIds: ["elementary-fractions"],
      },
      {
        id: "perfect-square-factorization",
        difficulty: "algebra",
        statement: translated(
          "Factoriser complètement $$9x^2-24x+16$$ et expliquer comment reconnaître la forme obtenue.",
          "Factor completely $$9x^2-24x+16$$ and explain how to recognise the resulting form.",
        ),
        prompt: translated("Factoriser : $$9x^2-24x+16$$", "Factor: $$9x^2-24x+16$$"),
        expected: "(3x-4)^2",
        answerDisplay: "$$(3x-4)^2$$",
        hints: [
          translated("Les termes extrêmes sont $(3x)^2$ et $4^2$.", "The outside terms are $(3x)^2$ and $4^2$."),
          translated("Vérifie que le terme central est $-2\\times3x\\times4$.", "Check that the middle term is $-2\\times3x\\times4$."),
        ],
        solution: translated(
          "On a $9x^2=(3x)^2$, $16=4^2$ et $-24x=-2\\times3x\\times4$. Donc $$9x^2-24x+16=(3x-4)^2.$$",
          "We have $9x^2=(3x)^2$, $16=4^2$ and $-24x=-2\\times3x\\times4$. Therefore $$9x^2-24x+16=(3x-4)^2.$$",
        ),
        explanation: translated("Les trois termes correspondent exactement à l'identité $(a-b)^2$.", "The three terms exactly match $(a-b)^2$."),
        insight: translated("Tester le double produit est indispensable : deux termes carrés ne suffisent pas.", "Checking the double product is essential: two square terms alone are not enough."),
        courseHintIds: ["elementary-identities", "elementary-factorization"],
      },
      {
        id: "linear-equation-fraction",
        difficulty: "algebra",
        statement: translated(
          "Résoudre exactement $$6(x-2)-3x=5.$$",
          "Solve exactly $$6(x-2)-3x=5.$$",
        ),
        prompt: translated("Résoudre : $$6(x-2)-3x=5$$", "Solve: $$6(x-2)-3x=5$$"),
        expected: new Fraction(17n, 3n),
        answerDisplay: "$$x=\\frac{17}{3}$$",
        hints: [
          translated("Commence par développer $6(x-2)$.", "First expand $6(x-2)$."),
          translated("Après réduction, l'équation devient $3x-12=5$.", "After collecting terms, the equation is $3x-12=5$."),
        ],
        solution: translated(
          "On développe puis on isole $x$ : $$6x-12-3x=5\\iff3x=17\\iff x=\\frac{17}{3}.$$",
          "Expand, then isolate $x$: $$6x-12-3x=5\\iff3x=17\\iff x=\\frac{17}{3}.$$",
        ),
        explanation: translated("La solution exacte est une fraction irréductible.", "The exact solution is a reduced fraction."),
        courseHintIds: ["elementary-linear-equations", "elementary-distributivity"],
      },
    ],
  },
  answer: { type: "text" },
  feedback: {
    showCorrection: true,
    showExplanation: true,
    showInsight: true,
    showHints: true,
    showCourseHintOnError: false,
    nextQuestion: true,
  },
};









function identityQuestion(difficulty, rng, exerciseLevel = null) {
  const level = currentDifficulty(difficulty, "identify");
  const numericLevel = Number(exerciseLevel);
  const identityCoefficientBounds = level === "mixed"
    ? [2, 9]
    : numericLevel === 1
      ? [1, 1]
      : numericLevel === 2
        ? [2, 5]
        : numericLevel === 3
          ? [2, 9]
          : [1, 1];
  const shiftBounds = level === "mixed"
    ? [5, 25]
    : numericLevel === 1
      ? [2, 6]
      : numericLevel === 2
        ? [2, 10]
        : numericLevel === 3
          ? [4, 25]
          : [2, 10];
  const [minimumIdentityCoefficient, maximumIdentityCoefficient] = identityCoefficientBounds;
  const [minimumShift, maximumShift] = shiftBounds;
  const identityCoefficientChoices = [];

  for (let coefficient = minimumIdentityCoefficient; coefficient <= maximumIdentityCoefficient; coefficient += 1) {
    identityCoefficientChoices.push(coefficient);
  }

  const pickIdentityParameters = () => {
    const coefficient = pickRandom(identityCoefficientChoices, rng);
    const coefficientMode = coefficient === 1
      ? "basic"
      : pickRandom(["outer-factor", "inner-square"], rng);
    const outerCoefficient = coefficientMode === "outer-factor" ? coefficient : 1;
    const xCoefficient = coefficientMode === "inner-square" ? coefficient : 1;

    return {
      coefficientMode,
      identityCoefficient: coefficient,
      outerCoefficient,
      xCoefficient,
      leadingCoefficient: outerCoefficient * xCoefficient * xCoefficient,
    };
  };
  const factorPrefix = (coefficient, forExpected = false) => (
    coefficient === 1
      ? ""
      : forExpected
        ? `${coefficient}*`
        : String(coefficient)
  );
  const decide = () => {
    const expected = pickRandom([true, false], rng);
    const parameters = pickIdentityParameters();
    const {
      leadingCoefficient,
      outerCoefficient,
      xCoefficient,
    } = parameters;
    const shift = randomInteger(minimumShift, maximumShift, rng);
    const xTerm = xCoefficient === 1 ? "x" : `${xCoefficient}x`;
    const middleMagnitude = 2 * outerCoefficient * xCoefficient * shift;
    const constantMagnitude = outerCoefficient * shift * shift;
    const exactSum = quadraticExpression(leadingCoefficient, middleMagnitude, constantMagnitude, true);
    const exactDifference = quadraticExpression(leadingCoefficient, -middleMagnitude, constantMagnitude, true);
    const exactConjugates = quadraticExpression(leadingCoefficient, 0, -constantMagnitude, true);
    const prefix = factorPrefix(outerCoefficient);
    const sumSquareToDevelop = `${prefix}(${xTerm}+${shift})^2`;
    const differenceSquareToDevelop = `${prefix}(${xTerm}-${shift})^2`;
    const conjugatesToDevelop = `${prefix}(${xTerm}-${shift})(${xTerm}+${shift})`;
    const trueCases = [
      {
        variant: "decision-sum-square",
        expression: exactSum,
        explanation: translated(
          `On reconnaît une identité remarquable : $$${exactSum}=${sumSquareToDevelop}.$$`,
          `This is a standard identity: $$${exactSum}=${sumSquareToDevelop}.$$`,
        ),
      },
      {
        variant: "decision-difference-square",
        expression: exactDifference,
        explanation: translated(
          `On reconnaît une identité remarquable : $$${exactDifference}=${differenceSquareToDevelop}.$$`,
          `This is a standard identity: $$${exactDifference}=${differenceSquareToDevelop}.$$`,
        ),
      },
      {
        variant: "decision-conjugates",
        expression: exactConjugates,
        explanation: translated(
          `On utilise $a^2-b^2=(a-b)(a+b)$ : $$${exactConjugates}=${conjugatesToDevelop}.$$`,
          `Use $a^2-b^2=(a-b)(a+b)$: $$${exactConjugates}=${conjugatesToDevelop}.$$`,
        ),
      },
      {
        variant: "decision-develop-sum-square",
        expression: sumSquareToDevelop,
        explanation: translated(
          `C'est la forme $(a+b)^2$. On peut donc la développer directement avec l'identité remarquable : $$${sumSquareToDevelop}=${exactSum}.$$`,
          `This has the form $(a+b)^2$, so it can be expanded directly using the standard identity: $$${sumSquareToDevelop}=${exactSum}.$$`,
        ),
      },
      {
        variant: "decision-develop-difference-square",
        expression: differenceSquareToDevelop,
        explanation: translated(
          `C'est la forme $(a-b)^2$. On peut donc la développer directement avec l'identité remarquable : $$${differenceSquareToDevelop}=${exactDifference}.$$`,
          `This has the form $(a-b)^2$, so it can be expanded directly using the standard identity: $$${differenceSquareToDevelop}=${exactDifference}.$$`,
        ),
      },
      {
        variant: "decision-develop-conjugates",
        expression: conjugatesToDevelop,
        explanation: translated(
          `Les deux facteurs sont conjugués : c'est la forme $(a-b)(a+b)$. Ainsi, $$${conjugatesToDevelop}=${exactConjugates}.$$`,
          `The two factors are conjugates, matching $(a-b)(a+b)$. Therefore, $$${conjugatesToDevelop}=${exactConjugates}.$$`,
        ),
      },
    ];

    const constantOffsetMagnitude = randomInteger(1, 3, rng);
    const constantOffsetSign = pickRandom([-1, 1], rng);
    const wrongConstantValue = constantMagnitude + constantOffsetSign * constantOffsetMagnitude;
    const wrongConstant = quadraticExpression(leadingCoefficient, middleMagnitude, wrongConstantValue, true);
    const middleOffset = randomInteger(1, 3, rng);
    const wrongMiddle = quadraticExpression(leadingCoefficient, middleMagnitude + middleOffset, constantMagnitude, true);
    const middleSign = pickRandom([-1, 1], rng);
    const signedMiddle = middleSign * middleMagnitude;
    const sumOfSquares = quadraticExpression(leadingCoefficient, 0, constantMagnitude, true);
    const incompatibleSigns = quadraticExpression(leadingCoefficient, signedMiddle, -constantMagnitude, true);
    const strayMiddleMagnitude = randomInteger(1, Math.max(3, middleMagnitude - 1), rng);
    const strayMiddle = quadraticExpression(
      leadingCoefficient,
      middleSign * strayMiddleMagnitude,
      -constantMagnitude,
      true,
    );
    const otherShift = shift === maximumShift
      ? shift - 1
      : shift + 1;
    const unequalSquaresProduct = `${prefix}(${xTerm}+${shift})(${xTerm}+${otherShift})`;
    const almostConjugatesProduct = `${prefix}(${xTerm}-${shift})(${xTerm}+${otherShift})`;
    const falseCases = [
      {
        variant: "decision-sum-of-squares",
        expression: sumOfSquares,
        explanation: translated(
          `$${sumOfSquares}$ est une somme de deux carrés. L'identité à deux termes est une différence : $a^2-b^2=(a-b)(a+b)$.`,
          `$${sumOfSquares}$ is a sum of two squares. The two-term identity uses a difference: $a^2-b^2=(a-b)(a+b)$.`,
        ),
      },
      {
        variant: "decision-wrong-constant",
        expression: wrongConstant,
        explanation: translated(
          `Avec les deux premiers termes, le dernier devrait être $${constantMagnitude}$, et non $${wrongConstantValue}$.`,
          `Given the first two terms, the last one should be $${constantMagnitude}$, not $${wrongConstantValue}$.`,
        ),
      },
      {
        variant: "decision-wrong-middle",
        expression: wrongMiddle,
        explanation: translated(
          `Le terme du milieu doit être $${middleMagnitude}x$, et non $${middleMagnitude + middleOffset}x$.`,
          `The middle term should be $${middleMagnitude}x$, not $${middleMagnitude + middleOffset}x$.`,
        ),
      },
      {
        variant: "decision-incompatible-signs",
        expression: incompatibleSigns,
        explanation: translated(
          `On rappelle que les identités remarquables sont $$(a+b)^2 = a^2+2ab+b^2$$ et $$(a-b)^2 = a^2-2ab+b^2$$.`,
          `A square would have a positive constant term, while a difference of squares would have no $x$ term.`,
        ),
      },
      {
        variant: "decision-stray-middle-term",
        expression: strayMiddle,
        explanation: translated(
          `$${exactConjugates}$ serait une différence de carrés, mais le terme en $x$ supplémentaire empêche d'appliquer directement l'identité.`,
          `$${exactConjugates}$ would be a difference of squares, but the extra $x$ term prevents direct use of the identity.`,
        ),
      },
      {
        variant: "decision-develop-unequal-factors",
        expression: unequalSquaresProduct,
        explanation: translated(
          `Les deux facteurs ne sont pas identiques : $${shift}\\neq${otherShift}$. Ce n'est donc pas un carré de la forme $(a+b)^2$.`,
          `The two factors are not identical because $${shift}\\neq${otherShift}$, so this is not a square of the form $(a+b)^2$.`,
        ),
      },
      {
        variant: "decision-develop-almost-conjugates",
        expression: almostConjugatesProduct,
        explanation: translated(
          `Les deux termes constants ne sont pas opposés : $-${shift}$ et $+${otherShift}$. Les facteurs ne sont donc pas conjugués.`,
          `The constant terms are not opposites: $-${shift}$ and $+${otherShift}$. Therefore, the factors are not conjugates.`,
        ),
      },
    ];

    const selected = pickRandom(expected ? trueCases : falseCases, rng);

    return {
      variant: selected.variant,
      ...parameters,
      shift,
      prompt: translated(
        `Vrai ou faux : une identité remarquable est-elle applicable ? $$${selected.expression}$$`,
        `True or false: can a standard identity be used? $$${selected.expression}$$`,
      ),
      expected,
      answer: { type: "boolean" },
      answerDisplay: translated(expected ? "Vrai" : "Faux", expected ? "True" : "False"),
      explanation: selected.explanation,
      courseHintIds: ["elementary-identities"],
    };
  };
  const develop = () => {
    const parameters = pickIdentityParameters();
    const {
      leadingCoefficient,
      outerCoefficient,
      xCoefficient,
    } = parameters;
    const shift = randomInteger(minimumShift, maximumShift, rng);
    const identity = pickRandom(["sum-square", "difference-square", "conjugates"], rng);
    const prefix = factorPrefix(outerCoefficient);
    const xTerm = xCoefficient === 1 ? "x" : `${xCoefficient}x`;
    const middleCoefficient = 2 * outerCoefficient * xCoefficient * shift;
    const constant = outerCoefficient * shift * shift;

    if (identity === "sum-square") {
      const expected = quadraticExpression(leadingCoefficient, middleCoefficient, constant);
      const display = quadraticExpression(leadingCoefficient, middleCoefficient, constant, true);

      return {
        variant: identity,
        ...parameters,
        shift,
        answerForm: "developed",
        prompt: translated(`Développer : $$${prefix}(${xTerm}+${shift})^2$$`, `Expand: $$${prefix}(${xTerm}+${shift})^2$$`),
        expected,
        answerDisplay: `$$${display}$$`,
        explanation: translated(
          `Avec $(a+b)^2=a^2+2ab+b^2$, on obtient $$${display}.$$`,
          `Using $(a+b)^2=a^2+2ab+b^2$, we get $$${display}.$$`,
        ),
      };
    }

    if (identity === "difference-square") {
      const expected = quadraticExpression(leadingCoefficient, -middleCoefficient, constant);
      const display = quadraticExpression(leadingCoefficient, -middleCoefficient, constant, true);

      return {
        variant: identity,
        ...parameters,
        shift,
        answerForm: "developed",
        prompt: translated(`Développer : $$${prefix}(${xTerm}-${shift})^2$$`, `Expand: $$${prefix}(${xTerm}-${shift})^2$$`),
        expected,
        answerDisplay: `$$${display}$$`,
        explanation: translated(
          `Avec $(a-b)^2=a^2-2ab+b^2$, on obtient $$${display}.$$`,
          `Using $(a-b)^2=a^2-2ab+b^2$, we get $$${display}.$$`,
        ),
      };
    }

    const expected = quadraticExpression(leadingCoefficient, 0, -constant);
    const display = quadraticExpression(leadingCoefficient, 0, -constant, true);

    return {
      variant: identity,
      ...parameters,
      shift,
      answerForm: "developed",
      prompt: translated(`Développer : $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})$$`, `Expand: $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})$$`),
      expected,
      answerDisplay: `$$${display}$$`,
      explanation: translated(
        `On utilise $(a-b)(a+b)=a^2-b^2$, donc $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})=${prefix}((${xTerm})^2-${shift * shift})=${display}.$$`,
        `Use $(a-b)(a+b)=a^2-b^2$, hence $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})=${prefix}((${xTerm})^2-${shift * shift})=${display}.$$`,
      ),
    };
  };
  const factor = () => {
    const parameters = pickIdentityParameters();
    const {
      leadingCoefficient,
      outerCoefficient,
      xCoefficient,
    } = parameters;
    const shift = randomInteger(minimumShift, maximumShift, rng);
    const identity = pickRandom(["sum-square", "difference-square", "conjugates"], rng);
    const displayPrefix = factorPrefix(outerCoefficient);
    const expectedPrefix = factorPrefix(outerCoefficient, true);
    const xTerm = xCoefficient === 1 ? "x" : `${xCoefficient}x`;
    const expectedXTerm = xCoefficient === 1 ? "x" : `${xCoefficient}*x`;
    const middleMagnitude = 2 * outerCoefficient * xCoefficient * shift;
    const constant = outerCoefficient * shift * shift;

    if (identity === "conjugates") {
      const promptExpression = quadraticExpression(leadingCoefficient, 0, -constant, true);
      const expected = `${expectedPrefix}(${expectedXTerm}-${shift})*(${expectedXTerm}+${shift})`;

      return {
        variant: "recognize-conjugates",
        ...parameters,
        shift,
        answerForm: "factorized",
        prompt: translated(`Factoriser à l'aide d'une identité remarquable : $$${promptExpression}$$`, `Factor using an identity: $$${promptExpression}$$`),
        expected,
        answerDisplay: `$$${displayPrefix}(${xTerm}-${shift})(${xTerm}+${shift})$$`,
        explanation: translated(
          `On utilise $a^2-b^2=(a-b)(a+b)$ : $$${promptExpression}=${displayPrefix}(${xTerm}-${shift})(${xTerm}+${shift}).$$`,
          `Use $a^2-b^2=(a-b)(a+b)$: $$${promptExpression}=${displayPrefix}(${xTerm}-${shift})(${xTerm}+${shift}).$$`,
        ),
      };
    }

    const middle = identity === "sum-square" ? middleMagnitude : -middleMagnitude;
    const promptExpression = quadraticExpression(leadingCoefficient, middle, constant, true);
    const sign = identity === "sum-square" ? "+" : "-";
    const expected = `${expectedPrefix}(${expectedXTerm}${sign}${shift})^2`;

    return {
      variant: `recognize-${identity}`,
      ...parameters,
      shift,
      answerForm: "factorized",
      prompt: translated(`Factoriser à l'aide d'une identité remarquable : $$${promptExpression}$$`, `Factor using an identity: $$${promptExpression}$$`),
      expected,
      answerDisplay: `$$${displayPrefix}(${xTerm}${sign}${shift})^2$$`,
      explanation: translated(
        `Le terme du milieu est le double produit attendu : $$${promptExpression}=${displayPrefix}(${xTerm}${sign}${shift})^2.$$`,
        `The middle term is the required double product: $$${promptExpression}=${displayPrefix}(${xTerm}${sign}${shift})^2.$$`,
      ),
    };
  };
  const completeFactorization = () => {
    const parameters = pickIdentityParameters();
    const {
      leadingCoefficient,
      outerCoefficient,
      xCoefficient,
    } = parameters;
    const shift = randomInteger(minimumShift, maximumShift, rng);
    const identity = pickRandom(["sum-square", "difference-square", "conjugates"], rng);
    const prefix = factorPrefix(outerCoefficient);
    const xTerm = xCoefficient === 1 ? "x" : `${xCoefficient}x`;
    const middleMagnitude = 2 * outerCoefficient * xCoefficient * shift;
    const constant = outerCoefficient * shift * shift;
    const blank = "\\boxed{\\phantom{00}}";

    if (identity === "conjugates") {
      const developed = quadraticExpression(leadingCoefficient, 0, -constant, true);

      return {
        variant: "complete-conjugates",
        ...parameters,
        shift,
        prompt: translated(
          `Compléter la factorisation : $$${developed}=${prefix}(${xTerm}-${blank})(${xTerm}+${blank}).$$`,
          `Complete the factorisation: $$${developed}=${prefix}(${xTerm}-${blank})(${xTerm}+${blank}).$$`,
        ),
        expected: shift,
        answer: { type: "integer", placeholder: translated("ex. 4", "e.g. 4") },
        answerDisplay: `$$${shift}$$`,
        explanation: translated(
          `Avec $a^2-b^2=(a-b)(a+b)$, on obtient $$${developed}=${prefix}(${xTerm}-${shift})(${xTerm}+${shift}).$$`,
          `Using $a^2-b^2=(a-b)(a+b)$ gives $$${developed}=${prefix}(${xTerm}-${shift})(${xTerm}+${shift}).$$`,
        ),
      };
    }

    const isSum = identity === "sum-square";
    const sign = isSum ? "+" : "-";
    const middle = isSum ? middleMagnitude : -middleMagnitude;
    const developed = quadraticExpression(leadingCoefficient, middle, constant, true);

    return {
      variant: `complete-${identity}`,
      ...parameters,
      shift,
      prompt: translated(
        `Compléter la factorisation : $$${developed}=${prefix}(${xTerm}${sign}${blank})^2.$$`,
        `Complete the factorisation: $$${developed}=${prefix}(${xTerm}${sign}${blank})^2.$$`,
      ),
      expected: shift,
      answer: { type: "integer", placeholder: translated("ex. 4", "e.g. 4") },
      answerDisplay: `$$${shift}$$`,
      explanation: translated(
        `On reconnaît l'identité remarquable : $$${developed}=${prefix}(${xTerm}${sign}${shift})^2.$$`,
        `Recognise the standard identity: $$${developed}=${prefix}(${xTerm}${sign}${shift})^2.$$`,
      ),
    };
  };
  const completeDevelopment = () => {
    const parameters = pickIdentityParameters();
    const {
      leadingCoefficient,
      outerCoefficient,
      xCoefficient,
    } = parameters;
    const shift = randomInteger(minimumShift, maximumShift, rng);
    const identity = pickRandom(["sum-square", "difference-square", "conjugates"], rng);
    const prefix = factorPrefix(outerCoefficient);
    const xTerm = xCoefficient === 1 ? "x" : `${xCoefficient}x`;
    const middleMagnitude = 2 * outerCoefficient * xCoefficient * shift;
    const constant = outerCoefficient * shift * shift;
    const squaredXTerm = leadingCoefficient === 1 ? "x^2" : `${leadingCoefficient}x^2`;
    const blank = "\\boxed{\\phantom{-000x}}";

    if (identity === "conjugates") {
      const constantBlank = "\\boxed{\\phantom{000}}";

      return {
        variant: "complete-development-conjugates",
        ...parameters,
        shift,
        prompt: translated(
          `Compléter le développement : $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})=${squaredXTerm}-${constantBlank}.$$`,
          `Complete the expansion: $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})=${squaredXTerm}-${constantBlank}.$$`,
        ),
        expected: constant,
        answer: { type: "integer", placeholder: translated("ex. 16", "e.g. 16") },
        answerDisplay: `$$${constant}$$`,
        explanation: translated(
          `Avec $(a-b)(a+b)=a^2-b^2$, le terme manquant est $${constant}$ : $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})=${quadraticExpression(leadingCoefficient, 0, -constant, true)}.$$`,
          `Using $(a-b)(a+b)=a^2-b^2$, the missing term is $${constant}$: $$${prefix}(${xTerm}-${shift})(${xTerm}+${shift})=${quadraticExpression(leadingCoefficient, 0, -constant, true)}.$$`,
        ),
      };
    }

    const isSum = identity === "sum-square";
    const sign = isSum ? "+" : "-";
    const middle = isSum ? middleMagnitude : -middleMagnitude;
    const expected = polynomial([{ coefficient: middle, variable: "x" }]);
    const display = polynomial([{ coefficient: middle, variable: "x" }], true);

    return {
      variant: `complete-development-${identity}`,
      ...parameters,
      shift,
      prompt: translated(
        `Compléter le développement : $$${prefix}(${xTerm}${sign}${shift})^2=${squaredXTerm}\\;${blank}+${constant}.$$`,
        `Complete the expansion: $$${prefix}(${xTerm}${sign}${shift})^2=${squaredXTerm}\\;${blank}+${constant}.$$`,
      ),
      expected,
      answerDisplay: `$$${display}$$`,
      explanation: translated(
        `Le terme manquant est le double produit, soit $$${display}.$$`,
        `The missing term is the double product, namely $$${display}.$$`,
      ),
    };
  };
  const pools = {
    identify: [
      { weight: 1, make: decide },
    ],
    recognize: [
      { weight: 1, make: factor },
      { weight: 1, make: completeFactorization },
    ],
    use: [
      { weight: 3, make: develop },
      { weight: 1, make: completeDevelopment },
    ],
    mixed: [
      { weight: 3, make: decide },
      { weight: 3, make: develop },
      { weight: 3, make: factor },
      { weight: 2, make: completeFactorization },
      { weight: 2, make: completeDevelopment },
    ],
  };

  const question = weightedPick(pools[level] ?? pools.recognize, rng).make();
  const promptUi = question.variant.startsWith("decision-")
    ? elementaryPromptUi.identifyIdentity
    : question.variant.startsWith("complete-development-")
      ? elementaryPromptUi.completeDevelopmentIdentity
      : question.variant.startsWith("complete-")
        ? elementaryPromptUi.completeFactorIdentity
        : question.answerForm === "factorized"
          ? elementaryPromptUi.factorIdentity
          : elementaryPromptUi.developIdentity;

  return {
    courseHintIds: ["elementary-identities"],
    insight: translated(
      "Commence par chercher un facteur commun, puis repère les deux carrés et vérifie le double produit.",
      "First look for a common factor, then identify the two squares and check the double product.",
    ),
    ...question,
    promptUi,
  };
}

function developmentQuestion(difficulty, rng) {
  const level = currentDifficulty(difficulty, "single");

  if (level === "single") {
    const coefficient = randomNonZero(-9, 9, rng);
    const shift = randomNonZero(-10, 10, rng);
    const expected = linearExpression(coefficient, coefficient * shift);
    const display = linearExpression(coefficient, coefficient * shift, true);
    const inner = linearExpression(1, shift, true);

    return {
      prompt: translated(`Développer et réduire : $$${coefficient}(${inner})$$`, `Expand and collect terms: $$${coefficient}(${inner})$$`),
      expected,
      answerDisplay: `$$${display}$$`,
      answerForm: "developed",
      explanation: translated(
        `On distribue ${coefficient} à chacun des deux termes : $$${coefficient}(${inner})=${display}.$$`,
        `Distribute ${coefficient} over both terms: $$${coefficient}(${inner})=${display}.$$`,
      ),
      courseHintIds: ["elementary-distributivity"],
    };
  }

  if (level === "double") {
    const leftShift = randomNonZero(-8, 8, rng);
    const rightShift = randomNonZero(-8, 8, rng);
    const expected = quadraticExpression(1, leftShift + rightShift, leftShift * rightShift);
    const display = quadraticExpression(1, leftShift + rightShift, leftShift * rightShift, true);
    const left = linearExpression(1, leftShift, true);
    const right = linearExpression(1, rightShift, true);

    return {
      prompt: translated(`Développer et réduire : $$(${left})(${right})$$`, `Expand and collect terms: $$(${left})(${right})$$`),
      expected,
      answerDisplay: `$$${display}$$`,
      answerForm: "developed",
      explanation: translated(
        `Chaque terme du premier facteur multiplie chaque terme du second, puis on réduit : $$(${left})(${right})=${display}.$$`,
        `Multiply every term in the first factor by every term in the second, then collect: $$(${left})(${right})=${display}.$$`,
      ),
      courseHintIds: ["elementary-distributivity"],
    };
  }

  if (level === "coefficients") {
    const a = randomNonZero(-5, 5, rng);
    const b = randomNonZero(-8, 8, rng);
    const c = randomNonZero(-5, 5, rng);
    const d = randomNonZero(-8, 8, rng);
    const expected = quadraticExpression(a * c, a * d + b * c, b * d);
    const display = quadraticExpression(a * c, a * d + b * c, b * d, true);
    const left = linearExpression(a, b, true);
    const right = linearExpression(c, d, true);

    return {
      prompt: translated(`Développer et réduire : $$(${left})(${right})$$`, `Expand and collect terms: $$(${left})(${right})$$`),
      expected,
      answerDisplay: `$$${display}$$`,
      answerForm: "developed",
      explanation: translated(
        `Les quatre produits donnent ensuite, après réduction, $$${display}.$$`,
        `The four products combine to give $$${display}.$$`,
      ),
      courseHintIds: ["elementary-distributivity"],
    };
  }

  const firstCoefficient = randomNonZero(-7, 7, rng);
  let secondCoefficient = randomNonZero(-7, 7, rng);
  while (secondCoefficient === firstCoefficient) {
    secondCoefficient = randomNonZero(-7, 7, rng);
  }
  const firstShift = randomNonZero(-9, 9, rng);
  const secondShift = randomNonZero(-9, 9, rng);
  const expected = linearExpression(
    firstCoefficient - secondCoefficient,
    firstCoefficient * firstShift - secondCoefficient * secondShift,
  );
  const display = linearExpression(
    firstCoefficient - secondCoefficient,
    firstCoefficient * firstShift - secondCoefficient * secondShift,
    true,
  );
  const first = linearExpression(1, firstShift, true);
  const second = linearExpression(1, secondShift, true);

  return {
    prompt: translated(
      `Développer et réduire : $$${firstCoefficient}(${first})-${secondCoefficient}(${second})$$`,
      `Expand and collect terms: $$${firstCoefficient}(${first})-${secondCoefficient}(${second})$$`,
    ),
    expected,
    answerDisplay: `$$${display}$$`,
    answerForm: "developed",
    explanation: translated(
      `On distribue les deux coefficients en conservant le signe « $-$ », puis on regroupe : $$${display}.$$`,
      `Distribute both coefficients, retaining the minus sign, then collect terms: $$${display}.$$`,
    ),
    insight: translated("Un signe moins placé devant une parenthèse change le signe de chacun de ses termes.", "A minus sign before parentheses changes every sign inside."),
    courseHintIds: ["elementary-distributivity"],
  };
}

function factorizationQuestion(difficulty, rng) {
  const level = currentDifficulty(difficulty, "common-factor");
  const commonFactor = () => {
    const factor = randomInteger(2, level === "mixed" ? 12 : 8, rng);
    let a;
    let b;

    do {
      a = randomNonZero(-7, 7, rng);
      b = randomNonZero(-9, 9, rng);
    } while (!areCoprime(a, b));

    const shown = linearExpression(factor * a, factor * b, true);
    const inside = linearExpression(a, b, true);
    const expected = `${factor}*(${linearExpression(a, b)})`;

    return {
      variant: "common-factor",
      prompt: translated(`Factoriser complètement : $$${shown}$$`, `Factor completely: $$${shown}$$`),
      expected,
      answerDisplay: `$$${factor}(${inside})$$`,
      answerForm: "factorized",
      explanation: translated(
        `${factor} est le facteur commun maximal : $$${shown}=${factor}(${inside}).$$`,
        `${factor} is the greatest common factor: $$${shown}=${factor}(${inside}).$$`,
      ),
      courseHintIds: ["elementary-factorization"],
    };
  };
  const differenceOfSquares = () => {
    const root = randomInteger(2, 12, rng);
    const shown = quadraticExpression(1, 0, -(root * root), true);

    return {
      variant: "difference-of-squares",
      prompt: translated(`Factoriser : $$${shown}$$`, `Factor: $$${shown}$$`),
      expected: `(x-${root})*(x+${root})`,
      answerDisplay: `$$(x-${root})(x+${root})$$`,
      answerForm: "factorized",
      explanation: translated(
        `Comme ${root * root}=${root}^2, on applique $a^2-b^2=(a-b)(a+b)$.`,
        `Since ${root * root}=${root}^2, use $a^2-b^2=(a-b)(a+b)$.`,
      ),
      courseHintIds: ["elementary-factorization", "elementary-identities"],
    };
  };
  const perfectSquare = () => {
    const root = randomInteger(2, 10, rng);
    const sign = pickRandom([1, -1], rng);
    const shown = quadraticExpression(1, 2 * sign * root, root * root, true);
    const operator = sign > 0 ? "+" : "-";

    return {
      variant: "perfect-square",
      prompt: translated(`Factoriser : $$${shown}$$`, `Factor: $$${shown}$$`),
      expected: `(x${operator}${root})^2`,
      answerDisplay: `$$(x${operator}${root})^2$$`,
      answerForm: "factorized",
      explanation: translated(
        `Les termes extrêmes sont des carrés et le terme central est leur double produit : $$${shown}=(x${operator}${root})^2.$$`,
        `The outside terms are squares and the middle term is twice their product: $$${shown}=(x${operator}${root})^2.$$`,
      ),
      courseHintIds: ["elementary-factorization", "elementary-identities"],
    };
  };
  const combined = () => {
    const factor = randomInteger(2, 7, rng);
    const root = randomInteger(2, 9, rng);
    const shown = quadraticExpression(factor, 0, -factor * root * root, true);

    return {
      variant: "combined",
      prompt: translated(`Factoriser complètement : $$${shown}$$`, `Factor completely: $$${shown}$$`),
      expected: `${factor}*(x-${root})*(x+${root})`,
      answerDisplay: `$$${factor}(x-${root})(x+${root})$$`,
      answerForm: "factorized",
      explanation: translated(
        `On extrait d'abord ${factor}, puis on reconnaît une différence de carrés : $$${shown}=${factor}(x-${root})(x+${root}).$$`,
        `First take out ${factor}, then recognise a difference of squares: $$${shown}=${factor}(x-${root})(x+${root}).$$`,
      ),
      insight: translated("Toujours chercher un facteur commun avant une identité remarquable.", "Always look for a common factor before using an identity."),
      courseHintIds: ["elementary-factorization", "elementary-identities"],
    };
  };
  const pools = {
    "common-factor": [{ weight: 1, make: commonFactor }],
    identities: [
      { weight: 2, make: differenceOfSquares },
      { weight: 2, make: perfectSquare },
    ],
    combined: [
      { weight: 1, make: combined },
      { weight: 1, make: perfectSquare },
    ],
    mixed: [
      { weight: 3, make: commonFactor },
      { weight: 2, make: differenceOfSquares },
      { weight: 2, make: perfectSquare },
      { weight: 2, make: combined },
    ],
  };

  return weightedPick(pools[level] ?? pools["common-factor"], rng).make();
}

function squareRootQuestion(difficulty, rng) {
  const level = currentDifficulty(difficulty, "perfect-squares");
  const squareFreeValues = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];
  const perfectSquare = () => {
    const root = randomInteger(1, level === "mixed" ? 20 : 20, rng);
    const radicand = root * root;

    return {
      variant: "perfect-square",
      prompt: translated(`Calculer : $$\\sqrt{${radicand}}$$`, `Compute: $$\\sqrt{${radicand}}$$`),
      expected: String(root),
      answerDisplay: `$$${root}$$`,
      explanation: translated(
        `Comme $${root}^2=${radicand}$ et ${root} est positif, $\\sqrt{${radicand}}=${root}$.`,
        `Since $${root}^2=${radicand}$ and ${root} is positive, $\\sqrt{${radicand}}=${root}$.`,
      ),
    };
  };
  const simplify = () => {
    const coefficient = randomInteger(2, level === "mixed" ? 10 : 7, rng);
    const squareFree = pickRandom(squareFreeValues, rng);
    const radicand = coefficient * coefficient * squareFree;
    const expected = squareRootToText({ coefficient, radicand: squareFree });
    const display = squareRootToLatex({ coefficient, radicand: squareFree });

    return {
      variant: "simplify",
      prompt: translated(`Simplifier : $$\\sqrt{${radicand}}$$`, `Simplify: $$\\sqrt{${radicand}}$$`),
      expected,
      answerDisplay: `$$${display}$$`,
      requireSimplified: true,
      explanation: translated(
        `On extrait le carré ${coefficient * coefficient} : $$\\sqrt{${radicand}}=\\sqrt{${coefficient * coefficient}\\times ${squareFree}}=${display}.$$`,
        `Extract the square ${coefficient * coefficient}: $$\\sqrt{${radicand}}=\\sqrt{${coefficient * coefficient}\\times ${squareFree}}=${display}.$$`,
      ),
    };
  };
  const product = () => {
    const squareFree = pickRandom([2, 3, 4, 5, 6, 7, 8, 9, 10], rng);
    const coefficient = randomInteger(2, 7, rng);
    const left = squareFree;
    const right = coefficient * coefficient * squareFree;
    const expected = coefficient * squareFree;

    return {
      variant: "product",
      prompt: translated(
        `Calculer et simplifier : $$\\sqrt{${left}}\\times\\sqrt{${right}}$$`,
        `Compute and simplify: $$\\sqrt{${left}}\\times\\sqrt{${right}}$$`,
      ),
      expected: String(expected),
      answerDisplay: `$$${expected}$$`,
      explanation: translated(
        `Pour des nombres positifs, $\\sqrt a\\sqrt b=\\sqrt{ab}$ : ici $\\sqrt{${left * right}}=${expected}$.`,
        `For non-negative numbers, $\\sqrt a\\sqrt b=\\sqrt{ab}$: here $\\sqrt{${left * right}}=${expected}$.`,
      ),
    };
  };
  const quotient = () => {
    const squareFree = pickRandom([2, 3, 4, 5, 6, 7, 8, 9, 10], rng);
    const coefficient = randomInteger(2, 7, rng);
    const numerator = coefficient * coefficient * squareFree;

    return {
      variant: "quotient",
      prompt: translated(
        `Calculer et simplifier : $$${fractionLatex(`\\sqrt{${numerator}}`, `\\sqrt{${squareFree}}`)}$$`,
        `Compute and simplify: $$${fractionLatex(`\\sqrt{${numerator}}`, `\\sqrt{${squareFree}}`)}$$`,
      ),
      expected: String(coefficient),
      answerDisplay: `$$${coefficient}$$`,
      explanation: translated(
        `On regroupe sous une racine : $$\\sqrt{${fractionLatex(numerator, squareFree)}}=\\sqrt{${coefficient * coefficient}}=${coefficient}.$$`,
        `Combine under one square root: $$\\sqrt{${fractionLatex(numerator, squareFree)}}=\\sqrt{${coefficient * coefficient}}=${coefficient}.$$`,
      ),
    };
  };
  const pools = {
    "perfect-squares": [{ weight: 1, make: perfectSquare }],
    simplify: [
      { weight: 3, make: simplify },
      { weight: 1, make: perfectSquare },
    ],
    operations: [
      { weight: 2, make: product },
      { weight: 2, make: quotient },
    ],
    mixed: [
      { weight: 2, make: perfectSquare },
      { weight: 3, make: simplify },
      { weight: 2, make: product },
      { weight: 2, make: quotient },
    ],
  };
  const question = weightedPick(pools[level] ?? pools["perfect-squares"], rng).make();

  return {
    courseHintIds: ["elementary-square-roots"],
    insight: question.variant === "simplify"
      ? translated("Cherche le plus grand carré parfait qui divise le nombre sous la racine.", "Look for the largest perfect-square divisor of the radicand.")
      : undefined,
    ...question,
  };
}

function powerQuestion(difficulty, rng) {
  const level = currentDifficulty(difficulty, "products");
  const product = (literal = false) => {
    const base = literal ? pickRandom(["x", "a", "y"], rng) : String(randomInteger(2, 9, rng));
    const firstExponent = randomInteger(2, 8, rng);
    const secondExponent = randomInteger(2, 8, rng);
    const exponent = firstExponent + secondExponent;

    return {
      variant: literal ? "literal-product" : "numeric-product",
      prompt: translated(
        `Simplifier sous la forme d'une seule puissance : $$${base}^{${firstExponent}}\\times ${base}^{${secondExponent}}$$`,
        `Write as a single power: $$${base}^{${firstExponent}}\\times ${base}^{${secondExponent}}$$`,
      ),
      expected: `${base}^${exponent}`,
      answerDisplay: `$$${base}^{${exponent}}$$`,
      explanation: translated(
        `Les bases sont identiques, donc on additionne les exposants : $${firstExponent}+${secondExponent}=${exponent}$.`,
        `The bases are the same, so add the exponents: $${firstExponent}+${secondExponent}=${exponent}$.`,
      ),
    };
  };
  const quotient = (literal = false) => {
    const base = literal ? pickRandom(["x", "a", "y"], rng) : String(randomInteger(2, 9, rng));
    const denominatorExponent = randomInteger(1, 6, rng);
    const numeratorExponent = denominatorExponent + randomInteger(1, 7, rng);
    const exponent = numeratorExponent - denominatorExponent;

    return {
      variant: literal ? "literal-quotient" : "numeric-quotient",
      prompt: translated(
        `Simplifier sous la forme d'une seule puissance : $$${fractionLatex(`${base}^{${numeratorExponent}}`, `${base}^{${denominatorExponent}}`)}$$`,
        `Write as a single power: $$${fractionLatex(`${base}^{${numeratorExponent}}`, `${base}^{${denominatorExponent}}`)}$$`,
      ),
      expected: `${base}^${exponent}`,
      answerDisplay: `$$${base}^{${exponent}}$$`,
      explanation: translated(
        `Dans un quotient de même base, on soustrait les exposants : $${numeratorExponent}-${denominatorExponent}=${exponent}$.`,
        `For a quotient with the same base, subtract exponents: $${numeratorExponent}-${denominatorExponent}=${exponent}$.`,
      ),
    };
  };
  const nested = () => {
    const base = pickRandom(["x", "a", "y", String(randomInteger(2, 7, rng))], rng);
    const firstExponent = randomInteger(2, 6, rng);
    const secondExponent = randomInteger(2, 5, rng);
    const exponent = firstExponent * secondExponent;

    return {
      variant: "power-of-power",
      prompt: translated(
        `Simplifier sous la forme d'une seule puissance : $$\\left(${base}^{${firstExponent}}\\right)^{${secondExponent}}$$`,
        `Write as a single power: $$\\left(${base}^{${firstExponent}}\\right)^{${secondExponent}}$$`,
      ),
      expected: `${base}^${exponent}`,
      answerDisplay: `$$${base}^{${exponent}}$$`,
      explanation: translated(
        `Pour une puissance de puissance, on multiplie les exposants : $${firstExponent}\\times${secondExponent}=${exponent}$.`,
        `For a power raised to a power, multiply exponents: $${firstExponent}\\times${secondExponent}=${exponent}$.`,
      ),
    };
  };
  const symbolicNine = () => ({
    variant: "symbolic-nine",
    prompt: translated(
      "Simplifier sous la forme d'une seule puissance de $3$ : $$3^n\\times 9$$",
      "Write as a single power of $3$: $$3^n\\times 9$$",
    ),
    expected: "3^(n+2)",
    answerDisplay: "$$3^{n+2}$$",
    explanation: translated(
      "Comme $9=3^2$, on a $$3^n\\times9=3^n\\times3^2=3^{n+2}.$$,",
      "Since $9=3^2$, $$3^n\\times9=3^n\\times3^2=3^{n+2}.$$,",
    ),
    insight: translated("Commence par écrire tous les facteurs avec la même base.", "First rewrite every factor with the same base."),
  });
  const negativeExponent = () => {
    const base = String(randomInteger(2, 9, rng));
    const exponent = randomInteger(2, 7, rng);

    return {
      variant: "negative-exponent",
      prompt: translated(
        `Écrire sans exposant négatif : $$${base}^{-${exponent}}$$`,
        `Rewrite without a negative exponent: $$${base}^{-${exponent}}$$`,
      ),
      expected: `1/${base}^${exponent}`,
      answerDisplay: `$$${fractionLatex(1, `${base}^{${exponent}}`)}$$`,
      explanation: translated(
        `La règle $a^{-m}=${fractionLatex(1, "a^m")}$ donne ici $${base}^{-${exponent}}=${fractionLatex(1, `${base}^{${exponent}}`)}$.`,
        `The rule $a^{-m}=${fractionLatex(1, "a^m")}$ gives $${base}^{-${exponent}}=${fractionLatex(1, `${base}^{${exponent}}`)}$.`,
      ),
    };
  };
  const pools = {
    products: [
      { weight: 3, make: () => product(false) },
      { weight: 1, make: () => product(true) },
    ],
    quotients: [
      { weight: 2, make: () => quotient(false) },
      { weight: 2, make: () => quotient(true) },
      { weight: 1, make: nested },
    ],
    literal: [
      { weight: 3, make: symbolicNine },
      { weight: 2, make: () => product(true) },
      { weight: 2, make: () => quotient(true) },
      { weight: 1, make: nested },
    ],
    advanced: [
      { weight: 2, make: symbolicNine },
      { weight: 2, make: negativeExponent },
      { weight: 2, make: nested },
      { weight: 1, make: () => quotient(true) },
    ],
  };
  const question = weightedPick(pools[level] ?? pools.products, rng).make();

  return {
    courseHintIds: ["elementary-powers"],
    ...question,
  };
}

function linearEquationQuestion(difficulty, rng) {
  const level = currentDifficulty(difficulty, "isolate");

  if (level === "isolate") {
    const coefficient = randomNonZero(-9, 9, rng);
    const solution = randomInteger(-10, 10, rng);
    const constant = randomInteger(-12, 12, rng);
    const right = coefficient * solution + constant;
    const leftDisplay = linearExpression(coefficient, constant, true);

    return {
      prompt: translated(`Résoudre dans $\\mathbb R$ : $$${leftDisplay}=${right}$$`, `Solve over $\\mathbb R$: $$${leftDisplay}=${right}$$`),
      expected: new Fraction(BigInt(solution)),
      answerDisplay: `$$x=${solution}$$`,
      explanation: translated(
        `On isole le terme en $x$ puis on divise par ${coefficient} : la solution est $$x=${solution}.$$`,
        `Isolate the $x$ term, then divide by ${coefficient}: $$x=${solution}.$$`,
      ),
      courseHintIds: ["elementary-linear-equations"],
    };
  }

  if (level === "both-sides") {
    let leftCoefficient = randomNonZero(-8, 8, rng);
    let rightCoefficient = randomNonZero(-8, 8, rng);
    while (leftCoefficient === rightCoefficient) {
      rightCoefficient = randomNonZero(-8, 8, rng);
    }
    const solution = randomInteger(-9, 9, rng);
    const leftConstant = randomInteger(-12, 12, rng);
    const rightConstant = (leftCoefficient - rightCoefficient) * solution + leftConstant;
    const left = linearExpression(leftCoefficient, leftConstant, true);
    const right = linearExpression(rightCoefficient, rightConstant, true);

    return {
      prompt: translated(`Résoudre dans $\\mathbb R$ : $$${left}=${right}$$`, `Solve over $\\mathbb R$: $$${left}=${right}$$`),
      expected: new Fraction(BigInt(solution)),
      answerDisplay: `$$x=${solution}$$`,
      explanation: translated(
        `On rassemble les termes en $x$ d'un côté et les constantes de l'autre. Après réduction, on trouve $$x=${solution}.$$`,
        `Move the $x$ terms to one side and constants to the other. Simplifying gives $$x=${solution}.$$`,
      ),
      courseHintIds: ["elementary-linear-equations"],
    };
  }

  if (level === "parentheses") {
    const outside = randomInteger(2, 7, rng);
    const shift = randomNonZero(-6, 6, rng);
    let rightCoefficient = randomNonZero(-6, 6, rng);
    while (rightCoefficient === outside) {
      rightCoefficient = randomNonZero(-6, 6, rng);
    }
    const solution = randomInteger(-8, 8, rng);
    const rightConstant = outside * (solution + shift) - rightCoefficient * solution;
    const inside = linearExpression(1, shift, true);
    const right = linearExpression(rightCoefficient, rightConstant, true);

    return {
      prompt: translated(
        `Résoudre dans $\\mathbb R$ : $$${outside}(${inside})=${right}$$`,
        `Solve over $\\mathbb R$: $$${outside}(${inside})=${right}$$`,
      ),
      expected: new Fraction(BigInt(solution)),
      answerDisplay: `$$x=${solution}$$`,
      explanation: translated(
        `On développe d'abord le membre de gauche, puis on regroupe les termes. La solution est $$x=${solution}.$$`,
        `First expand the left-hand side, then collect terms. The solution is $$x=${solution}.$$`,
      ),
      courseHintIds: ["elementary-linear-equations", "elementary-distributivity"],
    };
  }

  const coefficient = randomInteger(2, 9, rng) * pickRandom([-1, 1], rng);
  const constant = randomInteger(-12, 12, rng);
  let right = randomInteger(-15, 15, rng);
  while ((right - constant) % coefficient === 0) {
    right = randomInteger(-15, 15, rng);
  }
  const expected = new Fraction(BigInt(right - constant), BigInt(coefficient));
  const left = linearExpression(coefficient, constant, true);

  return {
    prompt: translated(`Résoudre exactement dans $\\mathbb R$ : $$${left}=${right}$$`, `Solve exactly over $\\mathbb R$: $$${left}=${right}$$`),
    expected,
    answerDisplay: `$$x=${expected.toLatex()}$$`,
    explanation: translated(
      `Après avoir isolé ${coefficient}x, on divise par ${coefficient} et on réduit : $$x=${expected.toLatex()}.$$`,
      `After isolating ${coefficient}x, divide by ${coefficient} and reduce: $$x=${expected.toLatex()}.$$`,
    ),
    insight: translated("Garde la valeur exacte sous forme de fraction : aucune approximation décimale n'est nécessaire.", "Keep the exact fractional value; no decimal approximation is needed."),
    courseHintIds: ["elementary-linear-equations", "elementary-fractions"],
  };
}













export const elementaryTools = [
  additionsTool,
  multiplicationsTool,
  fractionsTool,
  // squareRootsTool,
  // developmentTool,
  // factorizationTool,
  identitiesTool,
  // powersTool,
  // linearEquationsTool,
  // guidedMethodsTool,
];

export default elementaryTools;
