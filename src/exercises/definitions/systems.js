import {
  augmentedMatrixToLatex,
  systemToLatex,
} from "../../utils/gauss";
import { pickRandom, randomInteger } from "../core/random";
import {
  applyRowOperation,
  generateIntegerMatrix,
  generateUniqueSystem,
  rowOperationToLatex,
  solveLinearSystem,
  toFractionMatrix,
} from "../math/linearAlgebra";
import { asFraction } from "../math/rational";

const tr = (fr, en) => ({ fr, en });

const SYSTEM_DIFFICULTIES = [
  {
    id: "1",
    label: tr("Deux inconnues", "Two unknowns"),
    description: tr("Systèmes $2\\times2$ à coefficients simples.", "Simple $2\\times2$ systems."),
  },
  {
    id: "2",
    label: tr("Élimination", "Elimination"),
    description: tr("Coefficients relatifs et choix des opérations.", "Signed coefficients and choice of row operations."),
  },
  {
    id: "3",
    label: tr("Trois inconnues", "Three unknowns"),
    description: tr("Systèmes $3\\times3$ et paramètres libres.", "$3\\times3$ systems and free parameters."),
  },
];

const SERIES = {
  questionCount: 8,
  choices: [4, 8, 12],
  allowQuestionCount: true,
  allowRestart: true,
  autoAdvance: false,
  showSummary: true,
};

const SCORE = { enabled: true, showStreak: true };

const FEEDBACK = {
  showCorrection: true,
  showExplanation: true,
  showCourseHintOnError: true,
  showInsight: true,
};

function levelOf(difficulty) {
  const raw = typeof difficulty === "object" ? difficulty?.id : difficulty;
  const parsed = Number.parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(parsed) ? Math.min(3, Math.max(1, parsed)) : 1;
}

function exactMatrix(matrix) {
  return toFractionMatrix(matrix);
}

function systemLatex(augmentedMatrix, variableNames) {
  return systemToLatex(exactMatrix(augmentedMatrix), variableNames);
}

function solutionDisplay(variableNames, solution) {
  const rows = variableNames
    .map((name, index) => `${name}&=&${solution[index].toLatex()}`)
    .join("\\\\");
  return `$$\\left\\{\\begin{array}{rcl}${rows}\\end{array}\\right.$$`;
}

function nonZeroInteger(bound, rng) {
  const absolute = randomInteger(1, bound, rng);
  return rng() < 0.5 ? absolute : -absolute;
}

const CLASSIFICATION_OPTIONS = [
  { id: "unique", label: tr("Une solution unique", "One unique solution") },
  { id: "infinite", label: tr("Une infinité de solutions", "Infinitely many solutions") },
  { id: "inconsistent", label: tr("Aucune solution", "No solution") },
];

function classificationQuestion({
  id,
  difficulty,
  matrix,
  variableNames,
  expected,
  explanation,
}) {
  return {
    id,
    difficulty,
    prompt: tr(
      `Déterminer la nature de l'ensemble des solutions. ${systemLatex(matrix, variableNames)}`,
      `Determine the nature of the solution set. ${systemLatex(matrix, variableNames)}`,
    ),
    expected,
    options: CLASSIFICATION_OPTIONS,
    explanation,
  };
}

const CLASSIFICATION_BANK = [
  classificationQuestion({
    id: "class-unique-2",
    difficulty: "1",
    matrix: [[1, 1, 3], [1, -1, 1]],
    variableNames: ["x", "y"],
    expected: "unique",
    explanation: tr(
      "Les deux équations sont indépendantes. L'élimination donne $x=2$ et $y=1$.",
      "The two equations are independent. Elimination gives $x=2$ and $y=1$.",
    ),
  }),
  classificationQuestion({
    id: "class-infinite-2",
    difficulty: ["1", "2"],
    matrix: [[1, -2, 3], [2, -4, 6]],
    variableNames: ["x", "y"],
    expected: "infinite",
    explanation: tr(
      "La seconde équation est le double de la première : il ne reste qu'une contrainte pour deux inconnues.",
      "The second equation is twice the first: only one constraint remains for two unknowns.",
    ),
  }),
  classificationQuestion({
    id: "class-none-2",
    difficulty: ["1", "2"],
    matrix: [[1, 2, 1], [2, 4, 5]],
    variableNames: ["x", "y"],
    expected: "inconsistent",
    explanation: tr(
      "L'élimination produit l'égalité impossible $0=3$ : le système est incompatible.",
      "Elimination produces the impossible equality $0=3$: the system is inconsistent.",
    ),
  }),
  classificationQuestion({
    id: "class-unique-3",
    difficulty: ["2", "3"],
    matrix: [[1, 1, 0, 2], [0, 1, 1, 3], [1, 0, 1, 4]],
    variableNames: ["x", "y", "z"],
    expected: "unique",
    explanation: tr(
      "La forme échelonnée possède un pivot dans chacune des trois colonnes d'inconnues.",
      "The echelon form has a pivot in each of the three variable columns.",
    ),
  }),
  classificationQuestion({
    id: "class-infinite-3",
    difficulty: "3",
    matrix: [[1, 2, -1, 1], [0, 1, 1, 2], [1, 3, 0, 3]],
    variableNames: ["x", "y", "z"],
    expected: "infinite",
    explanation: tr(
      "La troisième ligne est la somme des deux premières. Il reste deux pivots et une inconnue libre.",
      "The third row is the sum of the first two. Two pivots and one free variable remain.",
    ),
  }),
  classificationQuestion({
    id: "class-none-3",
    difficulty: "3",
    matrix: [[1, 1, 1, 1], [2, 2, 2, 3], [0, 1, -1, 0]],
    variableNames: ["x", "y", "z"],
    expected: "inconsistent",
    explanation: tr(
      "Les deux premières équations ont des membres gauches proportionnels mais des seconds membres incompatibles.",
      "The first two left-hand sides are proportional, but their right-hand sides are inconsistent.",
    ),
  }),
];

export function generateSystemResolutionQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const variableCount = level === 3 && rng() < 0.55 ? 3 : 2;
  const bound = level === 1 ? 2 : 3;
  const generated = generateUniqueSystem(variableCount, {
    min: -bound,
    max: bound,
    solutionMin: level === 1 ? -3 : -4,
    solutionMax: level === 1 ? 3 : 4,
    rng,
  });
  const reduction = solveLinearSystem(generated);

  return {
    prompt: tr(
      `Résoudre le système suivant. ${systemToLatex(generated.augmentedMatrix, generated.variableNames)}`,
      `Solve the following system. ${systemToLatex(generated.augmentedMatrix, generated.variableNames)}`,
    ),
    expected: generated.solution,
    inputSize: variableCount,
    coordinateLabels: generated.variableNames,
    explanation: tr(
      `Après élimination de Gauss, on obtient ${systemToLatex(reduction.finalMatrix, generated.variableNames)} puis ${solutionDisplay(generated.variableNames, generated.solution)}`,
      `Gaussian elimination gives ${systemToLatex(reduction.finalMatrix, generated.variableNames)} and then ${solutionDisplay(generated.variableNames, generated.solution)}`,
    ),
    insight: tr(
      "Le système a été construit avec une solution exacte : aucune approximation décimale n'est nécessaire.",
      "The system was built with an exact solution: no decimal approximation is needed.",
    ),
  };
}

export function generateStructuredSystemQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const variableCount = level === 3 ? 3 : 2;
  const generated = generateUniqueSystem(variableCount, {
    min: level === 1 ? -2 : -3,
    max: level === 1 ? 2 : 3,
    solutionMin: -3,
    solutionMax: 3,
    rng,
  });
  const expected = { nature: "unique" };

  generated.variableNames.forEach((name, index) => {
    expected[name] = generated.solution[index];
  });

  const fields = [
    {
      id: "nature",
      label: tr("Nature (`unique`)", "Type (`unique`)"),
      answer: { type: "text", caseSensitive: false },
    },
    ...generated.variableNames.map((name) => ({
      id: name,
      label: `$${name}$`,
      answer: { type: "fraction" },
    })),
  ];

  return {
    prompt: tr(
      `Déterminer la nature du système puis donner chaque inconnue. ${systemToLatex(generated.augmentedMatrix, generated.variableNames)}`,
      `Determine the type of system, then give each unknown. ${systemToLatex(generated.augmentedMatrix, generated.variableNames)}`,
    ),
    expected,
    fields,
    answerDisplay: solutionDisplay(generated.variableNames, generated.solution),
    explanation: tr(
      `Il y a un pivot pour chaque inconnue, donc une solution unique : ${solutionDisplay(generated.variableNames, generated.solution)}`,
      `There is one pivot for each unknown, hence a unique solution: ${solutionDisplay(generated.variableNames, generated.solution)}`,
    ),
  };
}

function eliminationStepQuestion(level, rng) {
  const rowCount = level === 3 ? 3 : 2;
  const variableCount = rowCount;
  const pivot = level === 1 ? 1 : nonZeroInteger(2, rng);
  const multiple = nonZeroInteger(level === 1 ? 2 : 3, rng);
  const firstRow = [
    pivot,
    ...Array.from({ length: variableCount }, () => randomInteger(-3, 3, rng)),
  ];
  const targetRow = [
    pivot * multiple,
    ...Array.from({ length: variableCount }, () => randomInteger(-3, 3, rng)),
  ];
  const matrix = [firstRow, targetRow];

  while (matrix.length < rowCount) {
    matrix.push(Array.from({ length: variableCount + 1 }, () => randomInteger(-3, 3, rng)));
  }

  const operation = { type: "add", target: 1, source: 0, factor: -multiple };
  return { matrix: exactMatrix(matrix), operation };
}

function genericRowOperationQuestion(level, rng) {
  const rowCount = level === 3 ? 3 : 2;
  const variableCount = rowCount;
  const matrix = generateIntegerMatrix(rowCount, variableCount + 1, {
    min: -3,
    max: 3,
    rng,
  });
  const type = pickRandom(level === 2 ? ["swap", "add"] : ["swap", "add", "scale"], rng);

  if (type === "swap") {
    return { matrix, operation: { type: "swap", rows: [0, rowCount - 1] } };
  }

  if (type === "scale") {
    const factor = pickRandom([asFraction(-1), asFraction(2), asFraction("1/2")], rng);
    return { matrix, operation: { type: "scale", row: randomInteger(0, rowCount - 1, rng), factor } };
  }

  const target = randomInteger(1, rowCount - 1, rng);
  return {
    matrix,
    operation: {
      type: "add",
      target,
      source: 0,
      factor: nonZeroInteger(2, rng),
    },
  };
}

export function generateGaussStepQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const { matrix, operation } = level === 1 || rng() < 0.6
    ? eliminationStepQuestion(level, rng)
    : genericRowOperationQuestion(level, rng);
  const expected = applyRowOperation(matrix, operation);
  const variableCount = matrix[0].length - 1;
  const operationLatex = rowOperationToLatex(operation);

  return {
    prompt: tr(
      `Appliquer l'opération $${operationLatex}$ à la matrice augmentée suivante. ${augmentedMatrixToLatex(matrix, variableCount)}`,
      `Apply the operation $${operationLatex}$ to the following augmented matrix. ${augmentedMatrixToLatex(matrix, variableCount)}`,
    ),
    expected,
    inputDimensions: [matrix.length, matrix[0].length],
    explanation: tr(
      `On effectue la même opération sur chaque coefficient de la ligne, second membre compris. La matrice obtenue est ${augmentedMatrixToLatex(expected, variableCount)}`,
      `Apply the same operation to every entry in the row, including the right-hand side. The resulting matrix is ${augmentedMatrixToLatex(expected, variableCount)}`,
    ),
  };
}

function parametricQuestion({
  id,
  difficulty,
  matrix,
  variableNames,
  options,
  expected,
  answerDisplay,
  explanation,
}) {
  return {
    id,
    difficulty,
    prompt: tr(
      `Choisir une écriture paramétrique correcte de l'ensemble des solutions du système échelonné. ${systemLatex(matrix, variableNames)}`,
      `Choose a correct parametric form for the solution set of the echelon system. ${systemLatex(matrix, variableNames)}`,
    ),
    options: options.map((label, index) => ({ id: `option-${index + 1}`, label: tr(label, label) })),
    expected: `option-${expected}`,
    answerDisplay,
    explanation,
  };
}

const PARAMETRIC_BANK = [
  parametricQuestion({
    id: "param-one-free",
    difficulty: ["1", "2"],
    matrix: [[1, 0, 2, 3], [0, 1, -1, 1], [0, 0, 0, 0]],
    variableNames: ["x", "y", "z"],
    options: [
      "$x=3-2t,\\ y=1+t,\\ z=t$, $t\\in\\mathbb R$",
      "$x=3+2t,\\ y=1-t,\\ z=t$, $t\\in\\mathbb R$",
      "$x=3,\\ y=1,\\ z=0$",
      "$x=t,\\ y=1+t,\\ z=3-2t$, $t\\in\\mathbb R$",
    ],
    expected: 1,
    answerDisplay: "$$x=3-2t,\\qquad y=1+t,\\qquad z=t,\\qquad t\\in\\mathbb R$$",
    explanation: tr(
      "On choisit $z=t$. Les deux lignes pivots donnent alors $x=3-2t$ et $y=1+t$.",
      "Set $z=t$. The two pivot rows then give $x=3-2t$ and $y=1+t$.",
    ),
  }),
  parametricQuestion({
    id: "param-two-free",
    difficulty: ["2", "3"],
    matrix: [[1, -1, 1, 2], [0, 0, 0, 0]],
    variableNames: ["x", "y", "z"],
    options: [
      "$x=2+\\lambda-\\mu,\\ y=\\lambda,\\ z=\\mu$, $(\\lambda,\\mu)\\in\\mathbb R^2$",
      "$x=2-\\lambda+\\mu,\\ y=\\lambda,\\ z=\\mu$, $(\\lambda,\\mu)\\in\\mathbb R^2$",
      "$x=2,\\ y=0,\\ z=0$",
      "$x=\\lambda,\\ y=\\mu,\\ z=2+\\lambda-\\mu$",
    ],
    expected: 1,
    answerDisplay: "$$x=2+\\lambda-\\mu,\\qquad y=\\lambda,\\qquad z=\\mu$$",
    explanation: tr(
      "Les colonnes de $y$ et $z$ sont libres. Poser $y=\\lambda$ et $z=\\mu$ donne $x=2+\\lambda-\\mu$.",
      "The $y$ and $z$ columns are free. Setting $y=\\lambda$ and $z=\\mu$ gives $x=2+\\lambda-\\mu$.",
    ),
  }),
  parametricQuestion({
    id: "param-back-substitution",
    difficulty: "3",
    matrix: [[1, 2, -1, 1], [0, 1, 1, 2], [0, 0, 0, 0]],
    variableNames: ["x", "y", "z"],
    options: [
      "$x=-3+3t,\\ y=2-t,\\ z=t$, $t\\in\\mathbb R$",
      "$x=3-3t,\\ y=2+t,\\ z=t$, $t\\in\\mathbb R$",
      "$x=1-2t,\\ y=2-t,\\ z=t$, $t\\in\\mathbb R$",
      "$x=-3+t,\\ y=2-t,\\ z=t$, $t\\in\\mathbb R$",
    ],
    expected: 1,
    answerDisplay: "$$x=-3+3t,\\qquad y=2-t,\\qquad z=t,\\qquad t\\in\\mathbb R$$",
    explanation: tr(
      "On pose $z=t$, puis on remonte : $y=2-t$ et enfin $x=1-2(2-t)+t=-3+3t$.",
      "Set $z=t$, then back-substitute: $y=2-t$ and finally $x=1-2(2-t)+t=-3+3t$.",
    ),
  }),
];

const STUDY_BANK = [
  {
    id: "study-gauss-unique",
    difficulty: "1",
    statement: tr(
      `Résoudre par élimination de Gauss. ${systemLatex([[1, 1, 3], [2, -1, 0]], ["x", "y"])}`,
      `Solve by Gaussian elimination. ${systemLatex([[1, 1, 3], [2, -1, 0]], ["x", "y"])}`,
    ),
    hints: [
      tr("Éliminer $x$ dans la deuxième ligne avec $L_2\\leftarrow L_2-2L_1$.", "Eliminate $x$ from the second row with $L_2\\leftarrow L_2-2L_1$."),
      tr("La deuxième ligne devient $-3y=-6$.", "The second row becomes $-3y=-6$."),
    ],
    solution: tr(
      "$$\\left(\\begin{array}{cc|c}1&1&3\\\\2&-1&0\\end{array}\\right)\\xrightarrow{L_2\\leftarrow L_2-2L_1}\\left(\\begin{array}{cc|c}1&1&3\\\\0&-3&-6\\end{array}\\right).$$ Ainsi $y=2$, puis $x=1$.",
      "$$\\left(\\begin{array}{cc|c}1&1&3\\\\2&-1&0\\end{array}\\right)\\xrightarrow{L_2\\leftarrow L_2-2L_1}\\left(\\begin{array}{cc|c}1&1&3\\\\0&-3&-6\\end{array}\\right).$$ Hence $y=2$, then $x=1$.",
    ),
  },
  {
    id: "study-gauss-free",
    difficulty: ["2", "3"],
    statement: tr(
      `Décrire toutes les solutions. ${systemLatex([[1, 2, -1, 1], [0, 1, 1, 2], [0, 0, 0, 0]], ["x", "y", "z"])}`,
      `Describe all solutions. ${systemLatex([[1, 2, -1, 1], [0, 1, 1, 2], [0, 0, 0, 0]], ["x", "y", "z"])}`,
    ),
    hints: [
      tr("La colonne de $z$ ne contient aucun pivot : poser $z=t$.", "The $z$ column has no pivot: set $z=t$."),
      tr("Commencer la remontée par la deuxième équation.", "Start back-substitution with the second equation."),
    ],
    solution: tr(
      "Posons $z=t$. Alors $y=2-t$, puis $x=1-2(2-t)+t=-3+3t$. Ainsi $$S=\\{(-3+3t,2-t,t):t\\in\\mathbb R\\}.$$",
      "Set $z=t$. Then $y=2-t$, followed by $x=1-2(2-t)+t=-3+3t$. Thus $$S=\\{(-3+3t,2-t,t):t\\in\\mathbb R\\}.$$",
    ),
    insight: tr("Une variable libre produit ici une droite affine de solutions.", "One free variable produces an affine line of solutions."),
  },
  {
    id: "study-gauss-inconsistent",
    difficulty: ["2", "3"],
    statement: tr(
      `Étudier le système. ${systemLatex([[1, 2, 1], [2, 4, 5]], ["x", "y"])}`,
      `Study the system. ${systemLatex([[1, 2, 1], [2, 4, 5]], ["x", "y"])}`,
    ),
    hints: [tr("Calculer $L_2-2L_1$.", "Compute $L_2-2L_1$.")],
    solution: tr(
      "L'opération $L_2\\leftarrow L_2-2L_1$ donne la ligne $(0,0\\mid3)$, c'est-à-dire $0=3$. Le système n'a aucune solution.",
      "The operation $L_2\\leftarrow L_2-2L_1$ gives the row $(0,0\\mid3)$, i.e. $0=3$. The system has no solution.",
    ),
  },
];

const commonPractice = {
  categoryId: "systemes-lineaires",
  category: "systemes-lineaires",
  mode: "practice",
  difficulties: SYSTEM_DIFFICULTIES,
  defaultDifficulty: "1",
  series: SERIES,
  score: SCORE,
  feedback: FEEDBACK,
};

export const systemTools = [
  {
    ...commonPractice,
    id: "resoudre-systeme-lineaire",
    title: tr("Résoudre un système", "Solve a linear system"),
    description: tr("Donner les coordonnées de l'unique solution.", "Give the coordinates of the unique solution."),
    timer: { enabled: false },
    source: { type: "generator", generate: generateSystemResolutionQuestion },
    answer: { type: "coordinates", elementType: "fraction" },
    courseHintIds: ["gaussian-elimination"],
  },
  {
    ...commonPractice,
    id: "resolution-systeme-structuree",
    title: tr("Résolution structurée", "Structured system solving"),
    description: tr("Identifier la nature puis renseigner chaque inconnue.", "Identify the type, then fill in each unknown."),
    timer: { enabled: false },
    source: { type: "generator", generate: generateStructuredSystemQuestion },
    answer: { type: "multiple-fields" },
    courseHintIds: ["gaussian-elimination", "solution-types"],
  },
  {
    ...commonPractice,
    id: "nature-systeme-lineaire",
    title: tr("Nature de l'ensemble des solutions", "Type of solution set"),
    description: tr("Distinguer solution unique, infinité de solutions et incompatibilité.", "Distinguish a unique solution, infinitely many solutions and inconsistency."),
    timer: { enabled: true, mode: "per-question", seconds: { 1: 35, 2: 45, 3: 55 }, strict: true, show: true },
    source: { type: "bank", questions: CLASSIFICATION_BANK },
    answer: { type: "choice", options: CLASSIFICATION_OPTIONS },
    courseHintIds: ["solution-types"],
  },
  {
    ...commonPractice,
    id: "etape-pivot-gauss",
    title: tr("Une étape du pivot de Gauss", "One Gaussian-elimination step"),
    description: tr("Appliquer exactement une opération élémentaire à la matrice augmentée.", "Apply exactly one elementary row operation to an augmented matrix."),
    timer: { enabled: false },
    source: { type: "generator", generate: generateGaussStepQuestion },
    answer: { type: "matrix", elementType: "fraction" },
    courseHintIds: ["row-operations"],
  },
  {
    ...commonPractice,
    id: "ecriture-parametrique",
    title: tr("Écriture paramétrique", "Parametric form"),
    description: tr("Passer d'un système échelonné aux paramètres libres.", "Move from an echelon system to free parameters."),
    timer: { enabled: false },
    source: { type: "bank", questions: PARAMETRIC_BANK },
    answer: { type: "choice" },
    courseHintIds: ["parametric-solutions"],
  },
  {
    categoryId: "systemes-lineaires",
    category: "systemes-lineaires",
    id: "gauss-exercices-corriges",
    mode: "study",
    title: tr("Pivot de Gauss — exercices corrigés", "Gaussian elimination — worked exercises"),
    description: tr("Chercher, demander des indices puis dérouler une correction complète.", "Try, reveal hints, then read a complete worked solution."),
    difficulties: SYSTEM_DIFFICULTIES,
    defaultDifficulty: "1",
    timer: { enabled: false },
    score: { enabled: false },
    series: { questionCount: 3, allowRestart: true },
    source: { type: "bank", questions: STUDY_BANK },
    feedback: { showHints: true, showSolution: true, showInsight: true },
    courseHintIds: ["gaussian-elimination", "parametric-solutions"],
  },
];

export default systemTools;
