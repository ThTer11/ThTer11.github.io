import { pickRandom, randomInteger, shuffle } from "../core/random";
import {
  calculateDiscriminant,
  formatBiquadraticLatex,
  formatQuadraticLatex,
  quadraticFromRoots,
  solveBiquadraticExact,
  solveQuadraticExact,
} from "../math/quadratic";
import { Fraction } from "../math/rational";

const CATEGORY_ID = "second-degre";
const tr = (fr, en) => ({ fr, en });

function difficultyNumber(difficulty) {
  const parsed = Number(difficulty);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function integersBetween(min, max, { exclude = [] } = {}) {
  const forbidden = new Set(exclude.map(String));
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
    .filter((value) => !forbidden.has(String(value)));
}

function pickInteger(min, max, rng, options) {
  return pickRandom(integersBetween(min, max, options), rng);
}

function pickDistinct(items, first, rng) {
  return pickRandom(items.filter((item) => {
    if (item instanceof Fraction && first instanceof Fraction) {
      return !item.equals(first);
    }
    return String(item) !== String(first);
  }), rng);
}

function equationBlock(a, b, c) {
  return `$$${formatQuadraticLatex(a, b, c, { equation: true })}$$`;
}

function biquadraticEquationBlock(a, b, c) {
  return `$$${formatBiquadraticLatex(a, b, c, { equation: true })}$$`;
}

function solutionSetDisplay(roots) {
  if (roots.length === 0) {
    return "$$\\mathcal S=\\varnothing$$";
  }

  const values = roots.map((root) => root.toLatex?.() ?? String(root)).join(",\\;");
  return `$$\\mathcal S=\\left\\{${values}\\right\\}$$`;
}

function coefficientsForDiscriminant(level, rng) {
  const bounds = level === 1
    ? { a: 3, b: 6, c: 6 }
    : level === 2
      ? { a: 6, b: 10, c: 10 }
      : { a: 12, b: 18, c: 16 };

  return {
    a: pickInteger(-bounds.a, bounds.a, rng, { exclude: [0] }),
    b: randomInteger(-bounds.b, bounds.b, rng),
    c: randomInteger(-bounds.c, bounds.c, rng),
  };
}

export function generateDiscriminantQuestion({ difficulty, rng = Math.random }) {
  const level = difficultyNumber(difficulty);
  const { a, b, c } = coefficientsForDiscriminant(level, rng);
  const delta = calculateDiscriminant(a, b, c);

  return {
    prompt: tr(
      `Calculer le discriminant du trinôme suivant. ${equationBlock(a, b, c)}`,
      `Compute the discriminant of the following quadratic. ${equationBlock(a, b, c)}`,
    ),
    expected: delta,
    explanation: tr(
      `On applique $\\Delta=b^2-4ac$ : $$\\Delta=(${b})^2-4\\times(${a})\\times(${c})=${delta}.$$`,
      `Use $\\Delta=b^2-4ac$: $$\\Delta=(${b})^2-4\\times(${a})\\times(${c})=${delta}.$$`,
    ),
    courseHintIds: ["quadratic-discriminant"],
    meta: { a, b, c, discriminant: delta },
  };
}

function makeQuadraticWithRootCount(targetCount, level, rng) {
  const radius = level === 1 ? 4 : level === 2 ? 7 : 10;
  const multipliers = level === 1 ? [-1, 1] : [-3, -2, -1, 1, 2, 3];
  const multiplier = pickRandom(multipliers, rng);

  if (targetCount === 1) {
    const root = randomInteger(-radius, radius, rng);
    return quadraticFromRoots(root, root, multiplier);
  }

  if (targetCount === 2) {
    const roots = integersBetween(-radius, radius);
    const first = pickRandom(roots, rng);
    const second = pickDistinct(roots, first, rng);
    return quadraticFromRoots(first, second, multiplier);
  }

  const a = multiplier;
  const h = randomInteger(-Math.min(radius, 5), Math.min(radius, 5), rng);
  const k = Math.sign(a) * randomInteger(1, level === 1 ? 4 : 8, rng);
  return { a, b: -2 * a * h, c: a * h * h + k };
}

const ROOT_COUNT_OPTIONS = [
  { id: "0", label: tr("Aucune solution réelle", "No real solution") },
  { id: "1", label: tr("Une solution réelle (racine double)", "One real solution (repeated root)") },
  { id: "2", label: tr("Deux solutions réelles", "Two real solutions") },
];

export function generateRootCountQuestion({ difficulty, rng = Math.random }) {
  const level = difficultyNumber(difficulty);
  const targetCount = pickRandom([0, 1, 2], rng);
  const { a, b, c } = makeQuadraticWithRootCount(targetCount, level, rng);
  const delta = calculateDiscriminant(a, b, c);
  const natureFr = delta < 0 ? "strictement négatif" : delta === 0 ? "nul" : "strictement positif";
  const natureEn = delta < 0 ? "negative" : delta === 0 ? "zero" : "positive";
  const conclusionFr = targetCount === 0 ? "aucune solution réelle" : targetCount === 1 ? "une racine réelle double" : "deux solutions réelles";
  const conclusionEn = targetCount === 0 ? "no real solution" : targetCount === 1 ? "one repeated real root" : "two real roots";

  return {
    prompt: tr(
      `Combien cette équation possède-t-elle de solutions réelles ? ${equationBlock(a, b, c)}`,
      `How many real solutions does this equation have? ${equationBlock(a, b, c)}`,
    ),
    expected: String(targetCount),
    options: ROOT_COUNT_OPTIONS,
    explanation: tr(
      `Son discriminant vaut $\\Delta=${delta}$. Il est ${natureFr} : l'équation admet donc ${conclusionFr}.`,
      `Its discriminant is $\\Delta=${delta}$. It is ${natureEn}, so the equation has ${conclusionEn}.`,
    ),
    courseHintIds: ["quadratic-discriminant"],
    meta: { a, b, c, discriminant: delta },
  };
}

function properFractionCandidates(maxNumerator = 8, maxDenominator = 4) {
  const values = [];

  for (let denominator = 2; denominator <= maxDenominator; denominator += 1) {
    for (let numerator = -maxNumerator; numerator <= maxNumerator; numerator += 1) {
      const value = new Fraction(BigInt(numerator), BigInt(denominator));
      if (value.denominator !== 1n && !values.some((item) => item.equals(value))) {
        values.push(value);
      }
    }
  }

  return values;
}

function generatedRationalRoots(level, rng) {
  if (level < 3) {
    const radius = level === 1 ? 6 : 10;
    const candidates = integersBetween(-radius, radius).map((value) => Fraction.from(value));
    const first = pickRandom(candidates, rng);
    const makeDouble = level === 2 && rng() < 0.2;
    const second = makeDouble ? first : pickDistinct(candidates, first, rng);
    const multiplier = level === 1 ? 1 : pickRandom([-4, -3, -2, 2, 3, 4], rng);
    return { first, second, multiplier };
  }

  const candidates = properFractionCandidates();
  const first = pickRandom(candidates, rng);
  const second = pickDistinct(candidates, first, rng);
  return { first, second, multiplier: pickRandom([-2, -1, 1, 2], rng) };
}

export function generateQuadraticRootsQuestion({ difficulty, rng = Math.random }) {
  const level = difficultyNumber(difficulty);
  const { first, second, multiplier } = generatedRationalRoots(level, rng);
  const { a, b, c } = quadraticFromRoots(first, second, multiplier);
  const resolution = solveQuadraticExact(a, b, c);
  const roots = resolution.roots;
  const sqrtDelta = Math.sqrt(resolution.discriminant);

  return {
    prompt: tr(
      `Résoudre dans $\\mathbb R$ l'équation suivante. Donner les valeurs exactes. ${equationBlock(a, b, c)}`,
      `Solve the following equation over $\\mathbb R$. Give exact values. ${equationBlock(a, b, c)}`,
    ),
    expected: roots,
    answerDisplay: solutionSetDisplay(roots),
    explanation: tr(
      `On trouve $\\Delta=${resolution.discriminant}=${sqrtDelta}^{2}$. En appliquant $x=\\frac{-b\\pm\\sqrt\\Delta}{2a}$ puis en réduisant les fractions, on obtient ${solutionSetDisplay(roots)}`,
      `We get $\\Delta=${resolution.discriminant}=${sqrtDelta}^{2}$. Applying $x=\\frac{-b\\pm\\sqrt\\Delta}{2a}$ and reducing the fractions gives ${solutionSetDisplay(roots)}`,
    ),
    courseHintIds: ["quadratic-roots"],
    meta: { a, b, c, discriminant: resolution.discriminant },
  };
}

function shortcutQuestion({ a, b, c, roots, difficulty, explanation, insight }) {
  const exactRoots = roots.map((root) => Fraction.from(root));

  return {
    difficulty,
    prompt: tr(
      `Résoudre dans $\\mathbb R$ en cherchant d'abord une méthode courte. ${equationBlock(a, b, c)}`,
      `Solve over $\\mathbb R$, looking for a short method first. ${equationBlock(a, b, c)}`,
    ),
    expected: exactRoots,
    answerDisplay: solutionSetDisplay(exactRoots),
    explanation,
    insight,
    courseHintIds: ["quadratic-shortcuts"],
    meta: { a, b, c },
  };
}

const SHORTCUT_BANK = [
  shortcutQuestion({
    a: 1,
    b: 0,
    c: -25,
    roots: [-5, 5],
    difficulty: ["1", "2", "3"],
    explanation: tr(
      `$x^2-25=(x-5)(x+5)$, donc ${solutionSetDisplay([Fraction.from(-5), Fraction.from(5)])}`,
      `$x^2-25=(x-5)(x+5)$, hence ${solutionSetDisplay([Fraction.from(-5), Fraction.from(5)])}`,
    ),
    insight: tr(
      "C'est une différence de deux carrés : le discriminant est inutile ici.",
      "This is a difference of two squares, so the discriminant is unnecessary.",
    ),
  }),
  shortcutQuestion({
    a: 1,
    b: -8,
    c: 16,
    roots: [4],
    difficulty: ["1", "2", "3"],
    explanation: tr(
      "$x^2-8x+16=(x-4)^2$. L'unique racine est donc $4$.",
      "$x^2-8x+16=(x-4)^2$, so the only root is $4$.",
    ),
    insight: tr(
      "Reconnaître un carré parfait donne immédiatement la racine double.",
      "Recognising a perfect square gives the repeated root immediately.",
    ),
  }),
  shortcutQuestion({
    a: 3,
    b: -12,
    c: 0,
    roots: [0, 4],
    difficulty: ["1", "2"],
    explanation: tr(
      "$3x^2-12x=3x(x-4)$. Un produit est nul si l'un de ses facteurs est nul.",
      "$3x^2-12x=3x(x-4)$. A product is zero when one of its factors is zero.",
    ),
    insight: tr(
      "L'absence de terme constant signale immédiatement le facteur commun $x$.",
      "A missing constant term immediately reveals the common factor $x$.",
    ),
  }),
  shortcutQuestion({
    a: 2,
    b: 1,
    c: -3,
    roots: [1, new Fraction(-3n, 2n)],
    difficulty: ["2", "3"],
    explanation: tr(
      "Comme $2+1-3=0$, $1$ est une racine. Le produit des racines vaut $c/a=-3/2$, donc l'autre racine est $-3/2$.",
      "Since $2+1-3=0$, $1$ is a root. Their product is $c/a=-3/2$, so the other root is $-3/2$.",
    ),
    insight: tr(
      "Le test $a+b+c=0$ détecte la racine évidente $1$ ; somme ou produit donne ensuite l'autre.",
      "The check $a+b+c=0$ detects the obvious root $1$; sum or product then gives the other one.",
    ),
  }),
  shortcutQuestion({
    a: 3,
    b: 5,
    c: 2,
    roots: [-1, new Fraction(-2n, 3n)],
    difficulty: ["2", "3"],
    explanation: tr(
      "Comme $3-5+2=0$, $-1$ est une racine. Le produit vaut $2/3$, donc l'autre racine est $-2/3$.",
      "Since $3-5+2=0$, $-1$ is a root. Their product is $2/3$, so the other root is $-2/3$.",
    ),
    insight: tr(
      "Le test $a-b+c=0$ détecte la racine évidente $-1$.",
      "The check $a-b+c=0$ detects the obvious root $-1$.",
    ),
  }),
  shortcutQuestion({
    a: 1,
    b: -11,
    c: 24,
    roots: [3, 8],
    difficulty: ["2", "3"],
    explanation: tr(
      "On cherche deux nombres de somme $11$ et de produit $24$ : $3$ et $8$. Ainsi $x^2-11x+24=(x-3)(x-8)$.",
      "Look for two numbers whose sum is $11$ and product is $24$: $3$ and $8$. Thus $x^2-11x+24=(x-3)(x-8)$.",
    ),
    insight: tr(
      "Pour un trinôme unitaire à petites racines entières, somme et produit peuvent suffire mentalement.",
      "For a monic quadratic with small integer roots, sum and product can be enough mentally.",
    ),
  }),
];

export function generateObviousRootQuestion({ difficulty, rng = Math.random }) {
  const level = difficultyNumber(difficulty);
  const obviousRoot = pickRandom([-1, 1], rng);
  const otherRoot = pickRandom(
    integersBetween(-(level + 5), level + 5, { exclude: [obviousRoot] }),
    rng,
  );
  const multiplier = pickRandom(level === 1 ? [1] : [-3, -2, 1, 2, 3], rng);
  const { a, b, c } = quadraticFromRoots(obviousRoot, otherRoot, multiplier);
  const roots = solveQuadraticExact(a, b, c).roots;
  const identity = obviousRoot === 1 ? "a+b+c=0" : "a-b+c=0";
  const product = new Fraction(BigInt(c), BigInt(a)).toLatex();

  return {
    prompt: tr(
      `Résoudre dans $\\mathbb R$ en cherchant d'abord une racine évidente. ${equationBlock(a, b, c)}`,
      `Solve over $\\mathbb R$, looking for an obvious root first. ${equationBlock(a, b, c)}`,
    ),
    expected: roots,
    answerDisplay: solutionSetDisplay(roots),
    explanation: tr(
      `On remarque que $${identity}$ : $${obviousRoot}$ est donc une racine. Le produit des racines vaut $c/a=${product}$, ce qui donne l'autre racine.`,
      `Notice that $${identity}$, so $${obviousRoot}$ is a root. Their product is $c/a=${product}$, which gives the other root.`,
    ),
    insight: tr(
      `Tester mentalement $x=${obviousRoot}$ évite ici tout calcul de discriminant.`,
      `Mentally checking $x=${obviousRoot}$ avoids computing the discriminant here.`,
    ),
    courseHintIds: ["quadratic-shortcuts"],
    meta: { a, b, c, obviousRoot },
  };
}

const ORIENTATION_OPTIONS = [
  { id: "up", label: tr("La parabole est ouverte vers le haut", "The parabola opens upwards") },
  { id: "down", label: tr("La parabole est ouverte vers le bas", "The parabola opens downwards") },
];

const INTERSECTION_OPTIONS = [
  { id: "0", label: tr("Aucune intersection avec l'axe des abscisses", "No x-axis intersection") },
  { id: "1", label: tr("Une intersection avec l'axe des abscisses", "One x-axis intersection") },
  { id: "2", label: tr("Deux intersections avec l'axe des abscisses", "Two x-axis intersections") },
];

function combinedGraphLabel(orientation, intersections) {
  const up = orientation === "up";
  const frIntersections = intersections === 0
    ? "aucune intersection"
    : intersections === 1
      ? "une intersection"
      : "deux intersections";
  const enIntersections = intersections === 0
    ? "no intersection"
    : intersections === 1
      ? "one intersection"
      : "two intersections";

  return tr(
    `Ouverte vers le ${up ? "haut" : "bas"}, avec ${frIntersections} sur l'axe des abscisses`,
    `Opens ${up ? "upwards" : "downwards"}, with ${enIntersections} with the x-axis`,
  );
}

export function generateParabolaQuestion({ difficulty, rng = Math.random }) {
  const level = difficultyNumber(difficulty);
  const a = pickRandom([-2, -1, 1, 2], rng);
  const vertexX = randomInteger(-3, 3, rng);
  const intersectionCount = pickRandom([0, 1, 2], rng);
  const offsetMagnitude = randomInteger(1, 4, rng);
  const vertexY = intersectionCount === 1
    ? 0
    : intersectionCount === 0
      ? Math.sign(a) * offsetMagnitude
      : -Math.sign(a) * offsetMagnitude;
  const b = -2 * a * vertexX;
  const c = a * vertexX * vertexX + vertexY;
  const orientation = a > 0 ? "up" : "down";
  let prompt;
  let expected;
  let options;

  if (level === 1) {
    prompt = tr(
      "Dans quel sens cette parabole est-elle ouverte ?",
      "Which way does this parabola open?",
    );
    expected = orientation;
    options = ORIENTATION_OPTIONS;
  } else if (level === 2) {
    prompt = tr(
      "Combien de fois cette parabole coupe-t-elle l'axe des abscisses ?",
      "How many times does this parabola meet the x-axis?",
    );
    expected = String(intersectionCount);
    options = INTERSECTION_OPTIONS;
  } else {
    const allCombinations = ["up", "down"].flatMap((direction) =>
      [0, 1, 2].map((count) => ({
        id: `${direction}-${count}`,
        label: combinedGraphLabel(direction, count),
      })));
    expected = `${orientation}-${intersectionCount}`;
    const correct = allCombinations.find((option) => option.id === expected);
    const distractors = shuffle(
      allCombinations.filter((option) => option.id !== expected),
      rng,
    ).slice(0, 3);
    options = shuffle([correct, ...distractors], rng);
    prompt = tr(
      "Quelle description qualitative correspond à cette parabole ?",
      "Which qualitative description matches this parabola?",
    );
  }

  const delta = calculateDiscriminant(a, b, c);
  const intersectionsFr = intersectionCount === 0
    ? "zéro intersection"
    : intersectionCount === 1
      ? "une intersection"
      : "deux intersections";
  const intersectionsEn = intersectionCount === 0
    ? "no x-axis intersection"
    : intersectionCount === 1
      ? "one x-axis intersection"
      : "two x-axis intersections";

  return {
    prompt,
    expected,
    options,
    diagram: {
      type: "parabola",
      a,
      b,
      c,
      xMin: vertexX - 6,
      xMax: vertexX + 6,
      yMin: -10,
      yMax: 10,
    },
    explanation: tr(
      `Ici $a=${a}$ : la parabole est ouverte vers le ${a > 0 ? "haut" : "bas"}. De plus $\\Delta=${delta}$, donc elle possède ${intersectionsFr} avec l'axe des abscisses. Son sommet a pour abscisse $x_S=${vertexX}$.`,
      `Here $a=${a}$, so the parabola opens ${a > 0 ? "upwards" : "downwards"}. Also $\\Delta=${delta}$, so it has ${intersectionsEn}. Its vertex has x-coordinate $x_V=${vertexX}$.`,
    ),
    courseHintIds: ["quadratic-parabola"],
    meta: { a, b, c, discriminant: delta, vertexX, vertexY },
  };
}

function squareFraction(value) {
  const fraction = Fraction.from(value);
  return fraction.mul(fraction);
}

function biquadraticYRoots(level, rng) {
  if (level === 1) {
    const positive = [1, 4, 9, 16, 25].map(Fraction.from);
    const first = pickRandom(positive, rng);
    return [first, pickDistinct(positive, first, rng)];
  }

  if (level === 2) {
    const positive = Fraction.from(pickRandom([1, 4, 9, 16], rng));
    const negative = Fraction.from(-pickRandom([1, 4, 9, 16], rng));
    return [positive, negative];
  }

  const rootsForX = properFractionCandidates(7, 4)
    .filter((value) => value.numerator > 0n);
  const firstX = pickRandom(rootsForX, rng);
  const secondX = pickDistinct(rootsForX, firstX, rng);
  return [squareFraction(firstX), squareFraction(secondX)];
}

export function generateBiquadraticQuestion({ difficulty, rng = Math.random }) {
  const level = difficultyNumber(difficulty);
  const [firstY, secondY] = biquadraticYRoots(level, rng);
  const multiplier = pickRandom(level === 1 ? [1] : [-2, -1, 1, 2], rng);
  const { a, b, c } = quadraticFromRoots(firstY, secondY, multiplier);
  const resolution = solveBiquadraticExact(a, b, c);
  const sortedYRoots = [firstY, secondY].sort((left, right) =>
    Number(left.numerator * right.denominator - right.numerator * left.denominator));
  const yDisplay = solutionSetDisplay(sortedYRoots);

  return {
    prompt: tr(
      `Résoudre dans $\\mathbb R$ l'équation bicarrée suivante. ${biquadraticEquationBlock(a, b, c)}`,
      `Solve the following biquadratic equation over $\\mathbb R$. ${biquadraticEquationBlock(a, b, c)}`,
    ),
    expected: resolution.roots,
    answerDisplay: solutionSetDisplay(resolution.roots),
    explanation: tr(
      `Posons $y=x^2$. L'équation devient $${formatQuadraticLatex(a, b, c, { variable: "y", equation: true })}$ et donne ${yDisplay} On garde les valeurs $y\\geq0$, puis on résout $x^2=y$ : ${solutionSetDisplay(resolution.roots)}`,
      `Set $y=x^2$. The equation becomes $${formatQuadraticLatex(a, b, c, { variable: "y", equation: true })}$ and gives ${yDisplay} Keep the values $y\\geq0$, then solve $x^2=y$: ${solutionSetDisplay(resolution.roots)}`,
    ),
    insight: tr(
      "Le retour de $y$ vers $x$ est une étape à part entière : une racine négative en $y$ ne produit aucune racine réelle en $x$.",
      "Returning from $y$ to $x$ is a separate step: a negative $y$-root yields no real $x$-root.",
    ),
    courseHintIds: ["quadratic-biquadratic"],
    meta: { a, b, c, yRoots: [firstY, secondY] },
  };
}

const PRACTICE_FEEDBACK = {
  showCorrection: true,
  showExplanation: true,
  showInsight: true,
  showCourseHintOnError: true,
};

const STANDARD_SERIES = {
  questionCount: 10,
  choices: [5, 10, 15, 20],
  allowQuestionCount: true,
};

export const discriminantTool = {
  id: "discriminant-rapide",
  categoryId: CATEGORY_ID,
  title: tr("Calcul rapide du discriminant", "Quick discriminant calculation"),
  description: tr(
    "Automatiser le calcul exact de $\\Delta=b^2-4ac$.",
    "Build fluency with the exact calculation $\\Delta=b^2-4ac$.",
  ),
  difficulties: [
    { id: "1", label: tr("Coefficients simples", "Simple coefficients") },
    { id: "2", label: tr("Signes mélangés", "Mixed signs") },
    { id: "3", label: tr("Calcul soutenu", "Larger coefficients") },
  ],
  defaultDifficulty: "1",
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: { "1": 18, "2": 25, "3": 35 },
    strict: true,
    show: true,
  },
  series: STANDARD_SERIES,
  score: true,
  source: { type: "generator", generate: generateDiscriminantQuestion },
  answer: { type: "integer" },
  feedback: PRACTICE_FEEDBACK,
  courseHintIds: ["quadratic-discriminant"],
};

export const rootCountTool = {
  id: "nombre-solutions-second-degre",
  categoryId: CATEGORY_ID,
  title: tr("Nombre de solutions", "Number of real solutions"),
  description: tr(
    "Relier instantanément le signe du discriminant au nombre de racines réelles.",
    "Connect the sign of the discriminant to the number of real roots.",
  ),
  difficulties: [
    { id: "1", label: tr("Lecture directe", "Direct reading") },
    { id: "2", label: tr("Coefficients variés", "Varied coefficients") },
    { id: "3", label: tr("Réflexe rapide", "Quick decision") },
  ],
  defaultDifficulty: "1",
  timer: {
    enabled: true,
    mode: "per-question",
    seconds: { "1": 18, "2": 22, "3": 25 },
    strict: true,
    show: true,
  },
  series: STANDARD_SERIES,
  score: true,
  source: { type: "generator", generate: generateRootCountQuestion },
  answer: { type: "choice" },
  feedback: PRACTICE_FEEDBACK,
  courseHintIds: ["quadratic-discriminant"],
};

export const quadraticRootsTool = {
  id: "racines-second-degre",
  categoryId: CATEGORY_ID,
  title: tr("Calcul des racines", "Quadratic roots"),
  description: tr(
    "Résoudre exactement des équations à racines entières ou rationnelles.",
    "Solve equations exactly, with integer or rational roots.",
  ),
  difficulties: [
    { id: "1", label: tr("Racines entières", "Integer roots") },
    { id: "2", label: tr("Discriminant carré parfait", "Perfect-square discriminant") },
    { id: "3", label: tr("Racines fractionnaires", "Fractional roots") },
  ],
  defaultDifficulty: "1",
  timer: false,
  series: { ...STANDARD_SERIES, questionCount: 8 },
  score: true,
  source: { type: "generator", generate: generateQuadraticRootsQuestion },
  answer: { type: "solution-set", elementType: "fraction" },
  feedback: PRACTICE_FEEDBACK,
  courseHintIds: ["quadratic-roots"],
};

export const quadraticShortcutsTool = {
  id: "astuces-second-degre",
  categoryId: CATEGORY_ID,
  title: tr("Reconnaissance d'astuces", "Quadratic shortcuts"),
  description: tr(
    "Repérer une factorisation, une identité ou une racine évidente avant d'utiliser la formule générale.",
    "Spot a factorisation, identity or obvious root before using the general formula.",
  ),
  difficulties: [
    { id: "1", label: tr("Structures visibles", "Visible structures") },
    { id: "2", label: tr("Racines évidentes", "Obvious roots") },
    { id: "3", label: tr("Somme et produit", "Sum and product") },
  ],
  defaultDifficulty: "1",
  timer: false,
  series: { ...STANDARD_SERIES, questionCount: 8 },
  score: true,
  source: {
    type: "mix",
    sources: [
      {
        id: "curated-shortcuts",
        weight: 3,
        source: { type: "bank", questions: SHORTCUT_BANK },
      },
      {
        id: "obvious-root",
        weight: 2,
        source: { type: "generator", generate: generateObviousRootQuestion },
      },
    ],
  },
  answer: { type: "solution-set", elementType: "fraction" },
  feedback: PRACTICE_FEEDBACK,
  courseHintIds: ["quadratic-shortcuts"],
};

export const parabolaTool = {
  id: "allure-parabole",
  categoryId: CATEGORY_ID,
  title: tr("Allure qualitative d'une parabole", "Qualitative shape of a parabola"),
  description: tr(
    "Lire l'orientation, le sommet et les intersections sans dessin pixel-perfect.",
    "Read orientation, vertex and intersections without pixel-perfect drawing.",
  ),
  difficulties: [
    { id: "1", label: tr("Orientation", "Orientation") },
    { id: "2", label: tr("Intersections", "Intersections") },
    { id: "3", label: tr("Description complète", "Complete description") },
  ],
  defaultDifficulty: "1",
  timer: false,
  series: { ...STANDARD_SERIES, questionCount: 8 },
  score: true,
  source: { type: "generator", generate: generateParabolaQuestion },
  answer: { type: "choice" },
  feedback: PRACTICE_FEEDBACK,
  courseHintIds: ["quadratic-parabola"],
};

export const biquadraticTool = {
  id: "equations-bicarrees",
  categoryId: CATEGORY_ID,
  title: tr("Équations bicarrées", "Biquadratic equations"),
  description: tr(
    "Poser $y=x^2$, résoudre le second degré, puis revenir soigneusement à $x$.",
    "Set $y=x^2$, solve the quadratic, then return carefully to $x$.",
  ),
  difficulties: [
    { id: "1", label: tr("Quatre racines entières", "Four integer roots") },
    { id: "2", label: tr("Tri des racines en $y$", "Selecting valid y-roots") },
    { id: "3", label: tr("Racines fractionnaires", "Fractional roots") },
  ],
  defaultDifficulty: "1",
  timer: false,
  series: { ...STANDARD_SERIES, questionCount: 6 },
  score: true,
  source: { type: "generator", generate: generateBiquadraticQuestion },
  answer: { type: "solution-set", elementType: "fraction" },
  feedback: PRACTICE_FEEDBACK,
  courseHintIds: ["quadratic-biquadratic"],
};

const WORKED_QUADRATIC_BANK = [
  {
    id: "worked-factor-sign",
    difficulty: "1",
    statement: tr(
      "Résoudre puis étudier le signe de $x^2-6x+5$.",
      "Solve and then determine the sign of $x^2-6x+5$.",
    ),
    hints: [
      tr(
        "Chercher deux nombres dont la somme vaut $6$ et le produit $5$.",
        "Look for two numbers whose sum is $6$ and product is $5$.",
      ),
      tr(
        "Factoriser le trinôme, puis utiliser le signe de son coefficient dominant.",
        "Factor the quadratic, then use the sign of its leading coefficient.",
      ),
    ],
    solution: tr(
      "On factorise : $$x^2-6x+5=(x-1)(x-5).$$ Les racines sont $1$ et $5$. Comme le coefficient de $x^2$ est positif, le trinôme est positif sur $(-\\infty,1)\\cup(5,+\\infty)$, nul en $1$ et $5$, et négatif sur $(1,5)$.",
      "Factor: $$x^2-6x+5=(x-1)(x-5).$$ The roots are $1$ and $5$. Since the leading coefficient is positive, the quadratic is positive on $(-\\infty,1)\\cup(5,+\\infty)$, zero at $1$ and $5$, and negative on $(1,5)$.",
    ),
    insight: tr(
      "La factorisation donne simultanément les racines et le tableau de signes.",
      "The factorisation gives both the roots and the sign chart.",
    ),
  },
  {
    id: "worked-parameter",
    difficulty: "2",
    statement: tr(
      "Selon la valeur réelle de $m$, déterminer le nombre de solutions réelles de $x^2-2mx+m+2=0$.",
      "Depending on the real parameter $m$, determine the number of real solutions of $x^2-2mx+m+2=0$.",
    ),
    hints: [
      tr(
        "Calculer le discriminant comme une expression en $m$.",
        "Compute the discriminant as an expression in $m$.",
      ),
      tr(
        "Étudier le signe de $m^2-m-2=(m-2)(m+1)$.",
        "Study the sign of $m^2-m-2=(m-2)(m+1)$.",
      ),
    ],
    solution: tr(
      "Le discriminant vaut $$\\Delta=(-2m)^2-4(m+2)=4(m^2-m-2)=4(m-2)(m+1).$$ Il est positif si $m<-1$ ou $m>2$, nul pour $m=-1$ ou $m=2$, et négatif pour $-1<m<2$. L'équation possède donc respectivement deux, une ou zéro solution réelle.",
      "The discriminant is $$\\Delta=(-2m)^2-4(m+2)=4(m^2-m-2)=4(m-2)(m+1).$$ It is positive for $m<-1$ or $m>2$, zero for $m=-1$ or $m=2$, and negative for $-1<m<2$. The equation therefore has two, one or no real solution, respectively.",
    ),
  },
  {
    id: "worked-biquadratic",
    difficulty: "3",
    statement: tr(
      "Résoudre dans $\\mathbb R$ : $2x^4-5x^2+2=0$.",
      "Solve over $\\mathbb R$: $2x^4-5x^2+2=0$.",
    ),
    hints: [
      tr(
        "Poser $y=x^2$ et résoudre $2y^2-5y+2=0$.",
        "Set $y=x^2$ and solve $2y^2-5y+2=0$.",
      ),
      tr(
        "Les deux valeurs de $y$ sont positives ; chacune donne deux valeurs de $x$.",
        "Both y-values are positive; each gives two x-values.",
      ),
    ],
    solution: tr(
      "Avec $y=x^2$, on obtient $$2y^2-5y+2=(2y-1)(y-2)=0,$$ donc $y=\\frac12$ ou $y=2$. Ainsi $\\mathcal S=\\{-\\sqrt2,-\\frac{\\sqrt2}{2},\\frac{\\sqrt2}{2},\\sqrt2\\}$.",
      "With $y=x^2$, we obtain $$2y^2-5y+2=(2y-1)(y-2)=0,$$ so $y=\\frac12$ or $y=2$. Hence $\\mathcal S=\\{-\\sqrt2,-\\frac{\\sqrt2}{2},\\frac{\\sqrt2}{2},\\sqrt2\\}$.",
    ),
    insight: tr(
      "Les deux racines positives de l'équation en $y$ produisent quatre racines réelles en $x$.",
      "The two positive roots of the equation in $y$ produce four real roots in $x$.",
    ),
  },
];

export const workedQuadraticTool = {
  id: "exercices-corriges-second-degre",
  categoryId: CATEGORY_ID,
  mode: "study",
  title: tr("Exercices corrigés", "Worked quadratic exercises"),
  description: tr(
    "Des problèmes guidés avec indices progressifs et correction complète.",
    "Guided problems with progressive hints and a complete solution.",
  ),
  difficulties: [
    { id: "1", label: tr("Factorisation et signe", "Factorisation and sign") },
    { id: "2", label: tr("Équation avec paramètre", "Equation with a parameter") },
    { id: "3", label: tr("Bicarrée", "Biquadratic") },
  ],
  defaultDifficulty: "1",
  timer: false,
  score: false,
  series: { questionCount: 1, allowQuestionCount: false },
  source: { type: "bank", questions: WORKED_QUADRATIC_BANK },
  feedback: {
    showCorrection: true,
    showExplanation: true,
    showInsight: true,
  },
};

export const quadraticTools = [
  discriminantTool,
  rootCountTool,
  quadraticRootsTool,
  quadraticShortcutsTool,
  parabolaTool,
  biquadraticTool,
  workedQuadraticTool,
];

export default quadraticTools;
