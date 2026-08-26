import { matrixToLatex } from "../../utils/gauss";
import { pickRandom, randomInteger } from "../core/random";
import {
  determinant2,
  determinant3,
  generateIntegerMatrix,
  generateInvertibleMatrix,
  inverse2,
  isMatrixProductDefined,
  matrixProductDimensions,
  multiplyMatrices,
  toFractionMatrix,
} from "../math/linearAlgebra";

const tr = (fr, en) => ({ fr, en });

const MATRIX_DIFFICULTIES = [
  {
    id: "1",
    label: tr("Fondations", "Foundations"),
    description: tr("Petites dimensions et coefficients simples.", "Small dimensions and simple entries."),
  },
  {
    id: "2",
    label: tr("Intermédiaire", "Intermediate"),
    description: tr("Matrices rectangulaires et entiers relatifs.", "Rectangular matrices and signed integers."),
  },
  {
    id: "3",
    label: tr("Approfondissement", "Advanced"),
    description: tr("Dimensions variées et calculs plus denses.", "Varied dimensions and denser calculations."),
  },
];

const SERIES = {
  questionCount: 10,
  choices: [5, 10, 15, 20],
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

function matrixBody(matrix) {
  return matrixToLatex(toFractionMatrix(matrix)).replace(/^\$\$/, "").replace(/\$\$$/, "");
}

function matrixEquation(name, matrix) {
  return `${name}=${matrixBody(matrix)}`;
}

function nonZeroInteger(bound, rng) {
  const absolute = randomInteger(1, bound, rng);
  return rng() < 0.5 ? absolute : -absolute;
}

function coefficientRange(level) {
  return level === 1 ? { min: -2, max: 2 } : level === 2
    ? { min: -3, max: 3 }
    : { min: -4, max: 4 };
}

function differentDimension(innerDimension, maximum, rng) {
  return pickRandom(
    Array.from({ length: maximum }, (_, index) => index + 1)
      .filter((value) => value !== innerDimension),
    rng,
  );
}

export function generateProductCompatibilityQuestion(context, showEntries = false) {
  const { rng } = context;
  const level = levelOf(context.difficulty);
  const maximum = level === 1 ? 3 : 4;
  const leftRows = randomInteger(1, maximum, rng);
  const leftColumns = randomInteger(1, maximum, rng);
  const compatible = rng() < 0.55;
  const rightRows = compatible
    ? leftColumns
    : differentDimension(leftColumns, maximum, rng);
  const rightColumns = randomInteger(1, maximum, rng);
  const leftDimensions = [leftRows, leftColumns];
  const rightDimensions = [rightRows, rightColumns];
  const expected = isMatrixProductDefined(leftDimensions, rightDimensions);
  let prompt;

  if (showEntries) {
    const range = coefficientRange(level);
    const left = generateIntegerMatrix(leftRows, leftColumns, { ...range, rng });
    const right = generateIntegerMatrix(rightRows, rightColumns, { ...range, rng });
    prompt = tr(
      `Le produit $AB$ est-il défini ? $$${matrixEquation("A", left)},\\qquad ${matrixEquation("B", right)}$$`,
      `Is the product $AB$ defined? $$${matrixEquation("A", left)},\\qquad ${matrixEquation("B", right)}$$`,
    );
  } else {
    prompt = tr(
      `On a $A\\in M_{${leftRows},${leftColumns}}$ et $B\\in M_{${rightRows},${rightColumns}}$. Le produit $AB$ est-il défini ?`,
      `Let $A\\in M_{${leftRows},${leftColumns}}$ and $B\\in M_{${rightRows},${rightColumns}}$. Is $AB$ defined?`,
    );
  }

  return {
    prompt,
    expected,
    explanation: tr(
      `La matrice $A$ a ${leftColumns} colonne${leftColumns > 1 ? "s" : ""} et $B$ a ${rightRows} ligne${rightRows > 1 ? "s" : ""}. Le produit est donc ${expected ? "défini" : "impossible"}.`,
      `$A$ has ${leftColumns} column${leftColumns > 1 ? "s" : ""} and $B$ has ${rightRows} row${rightRows > 1 ? "s" : ""}. The product is therefore ${expected ? "defined" : "not defined"}.`,
    ),
    insight: expected
      ? tr(`La taille du produit sera $${leftRows}\\times ${rightColumns}$.`, `The product will have size $${leftRows}\\times ${rightColumns}$.`)
      : tr("Comparer uniquement les deux dimensions intérieures suffit.", "Only the two inner dimensions need to be compared."),
  };
}

export function generateProductSizeQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const maximum = level === 1 ? 3 : 4;
  const rows = randomInteger(1, maximum, rng);
  const inner = randomInteger(1, maximum, rng);
  const columns = randomInteger(1, maximum, rng);
  const expected = matrixProductDimensions([rows, inner], [inner, columns]);

  return {
    prompt: tr(
      `Si $A$ est de taille $${rows}\\times ${inner}$ et $B$ de taille $${inner}\\times ${columns}$, quelle est la taille de $AB$ ?`,
      `If $A$ has size $${rows}\\times ${inner}$ and $B$ has size $${inner}\\times ${columns}$, what is the size of $AB$?`,
    ),
    expected,
    explanation: tr(
      `Les dimensions extérieures sont conservées : $AB$ a ${rows} lignes et ${columns} colonnes.`,
      `The outer dimensions are retained: $AB$ has ${rows} rows and ${columns} columns.`,
    ),
  };
}

function productShapes(level, rng) {
  if (level === 1) {
    return [[2, 2], [2, 2]];
  }

  const choices = level === 2
    ? [
        [[2, 2], [2, 2]],
        [[2, 3], [3, 2]],
        [[2, 3], [3, 1]],
      ]
    : [
        [[3, 2], [2, 3]],
        [[2, 3], [3, 3]],
        [[3, 3], [3, 2]],
      ];
  return pickRandom(choices, rng);
}

export function generateMatrixProductQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const [leftShape, rightShape] = productShapes(level, rng);
  const range = coefficientRange(level);
  const zeroProbability = level === 1 ? 0.3 : level === 2 ? 0.2 : 0.1;
  const left = generateIntegerMatrix(leftShape[0], leftShape[1], {
    ...range,
    zeroProbability,
    rng,
  });
  const right = generateIntegerMatrix(rightShape[0], rightShape[1], {
    ...range,
    zeroProbability,
    rng,
  });
  const expected = multiplyMatrices(left, right);
  const [resultRows, resultColumns] = matrixProductDimensions(left, right);

  return {
    prompt: tr(
      `Calculer le produit $AB$. $$${matrixEquation("A", left)},\\qquad ${matrixEquation("B", right)}$$`,
      `Compute the product $AB$. $$${matrixEquation("A", left)},\\qquad ${matrixEquation("B", right)}$$`,
    ),
    expected,
    inputDimensions: [resultRows, resultColumns],
    explanation: tr(
      `Chaque coefficient s'obtient par un produit « ligne par colonne ». On trouve $$AB=${matrixBody(expected)}$$`,
      `Each entry is obtained by a row-by-column product. Thus $$AB=${matrixBody(expected)}$$`,
    ),
  };
}

export function generateDeterminant2Question({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const range = coefficientRange(level);
  const matrix = generateIntegerMatrix(2, 2, { ...range, rng });
  const expected = determinant2(matrix);
  const [[a, b], [c, d]] = matrix;

  return {
    prompt: tr(
      `Calculer le déterminant de la matrice suivante. $$A=${matrixBody(matrix)}$$`,
      `Compute the determinant of the following matrix. $$A=${matrixBody(matrix)}$$`,
    ),
    expected,
    explanation: tr(
      `Pour $A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$, $\\det(A)=ad-bc$. Ici, $${a.toLatex()}\\times ${d.toLatex()}-${b.toLatex()}\\times ${c.toLatex()}=${expected.toLatex()}$.`,
      `For $A=\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$, $\\det(A)=ad-bc$. Here, $${a.toLatex()}\\times ${d.toLatex()}-${b.toLatex()}\\times ${c.toLatex()}=${expected.toLatex()}$.`,
    ),
  };
}

function generateFriendlyInvertibleMatrix(level, rng) {
  const range = coefficientRange(level);

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const matrix = generateInvertibleMatrix(2, { ...range, rng, maxAttempts: 1 });
    const det = determinant2(matrix);

    if (level > 1 || det.abs().isOne()) {
      return matrix;
    }
  }

  const shear = nonZeroInteger(2, rng);
  return [[1, shear], [0, 1]];
}

export function generateInverse2Question({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const matrix = generateFriendlyInvertibleMatrix(level, rng);
  const det = determinant2(matrix);
  const expected = inverse2(matrix);

  return {
    prompt: tr(
      `Calculer directement l'inverse de $A$. $$A=${matrixBody(matrix)}$$`,
      `Compute the inverse of $A$. $$A=${matrixBody(matrix)}$$`,
    ),
    expected,
    inputDimensions: [2, 2],
    explanation: tr(
      `Comme $\\det(A)=${det.toLatex()}\\neq0$, la matrice est inversible et $$A^{-1}=${matrixBody(expected)}$$`,
      `Since $\\det(A)=${det.toLatex()}\\neq0$, the matrix is invertible and $$A^{-1}=${matrixBody(expected)}$$`,
    ),
  };
}

export function generateStructuredInverse2Question(context) {
  const matrix = generateFriendlyInvertibleMatrix(levelOf(context.difficulty), context.rng);
  const determinantValue = determinant2(matrix);
  const inverse = inverse2(matrix);
  const [[inverse11, inverse12], [inverse21, inverse22]] = inverse;

  return {
    prompt: tr(
      `Étudier l'inversibilité de $A$, calculer son déterminant puis son inverse. $$A=${matrixBody(matrix)}$$`,
      `Study whether $A$ is invertible, then compute its determinant and inverse. $$A=${matrixBody(matrix)}$$`,
    ),
    expected: {
      invertible: true,
      determinant: determinantValue,
      inverse11,
      inverse12,
      inverse21,
      inverse22,
    },
    fields: [
      {
        id: "invertible",
        label: tr("$A$ est inversible", "$A$ is invertible"),
        answer: { type: "boolean" },
      },
      {
        id: "determinant",
        label: tr("Déterminant", "Determinant"),
        answer: { type: "integer" },
      },
      {
        id: "inverse11",
        label: "$\\left(A^{-1}\\right)_{11}$",
        answer: { type: "fraction" },
      },
      {
        id: "inverse12",
        label: "$\\left(A^{-1}\\right)_{12}$",
        answer: { type: "fraction" },
      },
      {
        id: "inverse21",
        label: "$\\left(A^{-1}\\right)_{21}$",
        answer: { type: "fraction" },
      },
      {
        id: "inverse22",
        label: "$\\left(A^{-1}\\right)_{22}$",
        answer: { type: "fraction" },
      },
    ],
    answerDisplay: `$$\\det(A)=${determinantValue.toLatex()},\\qquad A^{-1}=${matrixBody(inverse)}$$`,
    explanation: tr(
      `Le déterminant vaut $${determinantValue.toLatex()}$, il est non nul. On applique alors la formule de l'inverse d'une matrice $2\\times2$.`,
      `The determinant is $${determinantValue.toLatex()}$, so it is nonzero. We can apply the inverse formula for a $2\\times2$ matrix.`,
    ),
  };
}

function triangularDeterminantQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const bound = level === 1 ? 3 : 4;
  const diagonal = Array.from({ length: 3 }, () => nonZeroInteger(bound, rng));
  const matrix = [
    [diagonal[0], randomInteger(-bound, bound, rng), randomInteger(-bound, bound, rng)],
    [0, diagonal[1], randomInteger(-bound, bound, rng)],
    [0, 0, diagonal[2]],
  ];
  const expected = determinant3(matrix);

  return {
    prompt: tr(
      `Calculer le déterminant en exploitant la structure de la matrice. $$A=${matrixBody(matrix)}$$`,
      `Compute the determinant by using the structure of the matrix. $$A=${matrixBody(matrix)}$$`,
    ),
    expected,
    explanation: tr(
      `La matrice est triangulaire : son déterminant est le produit des termes diagonaux, soit $${diagonal.join("\\times")}=${expected.toLatex()}$.`,
      `The matrix is triangular: its determinant is the product of its diagonal entries, namely $${diagonal.join("\\times")}=${expected.toLatex()}$.`,
    ),
    insight: tr("Repérer une structure triangulaire évite tout développement.", "Spotting a triangular matrix avoids any expansion."),
  };
}

function sparseDeterminantQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const bound = level === 1 ? 3 : level === 2 ? 4 : 5;
  const matrix = [
    [nonZeroInteger(bound, rng), 0, nonZeroInteger(bound, rng)],
    [randomInteger(-bound, bound, rng), nonZeroInteger(bound, rng), randomInteger(-bound, bound, rng)],
    [nonZeroInteger(bound, rng), 0, nonZeroInteger(bound, rng)],
  ];
  const expected = determinant3(matrix);

  return {
    prompt: tr(
      `Calculer le déterminant en choisissant un développement efficace. $$A=${matrixBody(matrix)}$$`,
      `Compute the determinant using an efficient expansion. $$A=${matrixBody(matrix)}$$`,
    ),
    expected,
    explanation: tr(
      `La deuxième colonne contient deux zéros : un développement suivant cette colonne donne rapidement $\\det(A)=${expected.toLatex()}$.`,
      `The second column contains two zeros: expanding along that column quickly gives $\\det(A)=${expected.toLatex()}$.`,
    ),
  };
}

function generalDeterminantQuestion({ difficulty, rng }) {
  const level = levelOf(difficulty);
  const bound = level === 3 ? 3 : 2;
  const matrix = generateIntegerMatrix(3, 3, { min: -bound, max: bound, rng });
  const expected = determinant3(matrix);

  return {
    prompt: tr(
      `Calculer le déterminant. $$A=${matrixBody(matrix)}$$`,
      `Compute the determinant. $$A=${matrixBody(matrix)}$$`,
    ),
    expected,
    explanation: tr(
      `Un développement suivant une ligne ou une colonne donne $\\det(A)=${expected.toLatex()}$.`,
      `Expanding along a row or column gives $\\det(A)=${expected.toLatex()}$.`,
    ),
  };
}

const commonPractice = {
  categoryId: "matrices",
  category: "matrices",
  mode: "practice",
  difficulties: MATRIX_DIFFICULTIES,
  defaultDifficulty: "1",
  series: SERIES,
  score: SCORE,
  feedback: FEEDBACK,
};

export const matrixTools = [
  {
    ...commonPractice,
    id: "compatibilite-produit-matriciel",
    title: tr("Compatibilité d'un produit", "Matrix-product compatibility"),
    description: tr("Reconnaître immédiatement si le produit $AB$ existe.", "Quickly determine whether $AB$ exists."),
    timer: { enabled: true, mode: "per-question", seconds: { 1: 12, 2: 12, 3: 15 }, strict: true, show: true },
    source: {
      type: "mix",
      sources: [
        {
          id: "dimensions",
          weight: 2,
          source: { type: "generator", generate: (context) => generateProductCompatibilityQuestion(context, false) },
        },
        {
          id: "matrices",
          weight: 1,
          source: { type: "generator", generate: (context) => generateProductCompatibilityQuestion(context, true) },
        },
      ],
    },
    answer: { type: "boolean" },
    courseHintIds: ["matrix-product"],
  },
  {
    ...commonPractice,
    id: "taille-produit-matriciel",
    title: tr("Taille du produit", "Size of a matrix product"),
    description: tr("Trouver les dimensions de $AB$ sans le calculer.", "Find the dimensions of $AB$ without computing it."),
    timer: { enabled: true, mode: "per-question", seconds: { 1: 12, 2: 12, 3: 15 }, strict: true, show: true },
    source: { type: "generator", generate: generateProductSizeQuestion },
    answer: {
      type: "coordinates",
      elementType: "integer",
      labels: [tr("Lignes", "Rows"), tr("Colonnes", "Columns")],
    },
    courseHintIds: ["matrix-product"],
  },
  {
    ...commonPractice,
    id: "calcul-produit-matriciel",
    title: tr("Calcul d'un produit matriciel", "Computing a matrix product"),
    description: tr("Appliquer méthodiquement le produit ligne-colonne.", "Apply the row-by-column rule methodically."),
    timer: { enabled: false },
    source: { type: "generator", generate: generateMatrixProductQuestion },
    answer: { type: "matrix", elementType: "integer" },
    courseHintIds: ["matrix-product"],
  },
  {
    ...commonPractice,
    id: "determinant-2x2",
    title: tr("Déterminant $2\\times2$", "$2\\times2$ determinant"),
    description: tr("Automatiser la formule $ad-bc$.", "Practise the formula $ad-bc$."),
    timer: { enabled: true, mode: "per-question", seconds: { 1: 20, 2: 25, 3: 30 }, strict: true, show: true },
    source: { type: "generator", generate: generateDeterminant2Question },
    answer: { type: "integer" },
    courseHintIds: ["matrix-determinant"],
  },
  {
    ...commonPractice,
    id: "inverse-2x2",
    title: tr("Inverse $2\\times2$ — calcul direct", "$2\\times2$ inverse — direct computation"),
    description: tr("Calculer directement une matrice inverse exacte.", "Compute an exact inverse matrix directly."),
    timer: { enabled: false },
    source: { type: "generator", generate: generateInverse2Question },
    answer: { type: "matrix", elementType: "fraction" },
    courseHintIds: ["matrix-inverse"],
  },
  {
    ...commonPractice,
    id: "inverse-2x2-etapes",
    title: tr("Inverse $2\\times2$ — étapes", "$2\\times2$ inverse — steps"),
    description: tr("Inversibilité, déterminant et matrice inverse dans une même question.", "Invertibility, determinant and inverse matrix in one question."),
    timer: { enabled: false },
    source: { type: "generator", generate: generateStructuredInverse2Question },
    answer: { type: "multiple-fields" },
    courseHintIds: ["matrix-determinant", "matrix-inverse"],
  },
  {
    ...commonPractice,
    id: "determinant-3x3",
    title: tr("Déterminant $3\\times3$", "$3\\times3$ determinant"),
    description: tr("Choisir un développement adapté à la structure de la matrice.", "Choose an expansion suited to the matrix structure."),
    timer: { enabled: false },
    source: {
      type: "mix",
      sources: [
        { id: "triangular", weight: 2, source: { type: "generator", generate: triangularDeterminantQuestion } },
        { id: "sparse", weight: 2, source: { type: "generator", generate: sparseDeterminantQuestion } },
        { id: "general", weight: 1, source: { type: "generator", generate: generalDeterminantQuestion } },
      ],
    },
    answer: { type: "integer" },
    courseHintIds: ["matrix-determinant"],
  },
];

export default matrixTools;
