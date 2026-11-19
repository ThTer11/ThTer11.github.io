import { equationCellsLatex, matrixToLatex, runMatrixInversion, systemToLatex } from "../../utils/gauss";
import { pickRandom, randomInteger, randomNonZeroInteger } from "../core/random";
import { determinant2, generateInvertibleMatrix, inverse2, toFractionMatrix, transposeMatrix } from "../math/linearAlgebra";
import { augmentedLatex, reducedForm, rowOperation, sameMatrix } from "../math/augmentedSystems";
import { asFraction, gcdBigInt } from "../math/rational";

const tr = (fr, en) => ({ fr, en });
const unknowns = ["x", "y", "z"];
const rightHandSides = ["a", "b", "c"];
const inverseDisplay = (matrix) => `$$A^{-1}=${matrixToLatex(matrix).slice(2, -2)}$$`;

function singular2(rng) {
  const row = [randomNonZeroInteger(-3, 3, rng), randomInteger(-3, 3, rng)].map(asFraction);
  const multiple = asFraction(randomInteger(-2, 2, rng));
  const other = row.map((coefficient) => coefficient.mul(multiple));
  const matrix = rng() < .5 ? [row, other] : [other, row];
  return rng() < .5 ? transposeMatrix(matrix) : matrix;
}

function triangular3(level, singular, rng) {
  const zeroPivot = singular ? randomInteger(0, 2, rng) : -1;
  const diagonal = level === 1 && rng() < .15;
  const matrix = Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) => {
      if (row === column) return row === zeroPivot ? 0 : pickRandom([-2, -1, 1, 2], rng);
      return row < column && !diagonal ? randomInteger(-2, 2, rng) : 0;
    }));

  if (!diagonal && matrix[0][1] === 0 && matrix[0][2] === 0 && matrix[1][2] === 0) {
    matrix[0][1] = randomNonZeroInteger(-2, 2, rng);
  }

  // One row addition moves a single nonzero entry below the diagonal.
  if (level === 2 && rng() < .6) {
    const source = pickRandom([0, 1].filter((row) => row !== zeroPivot), rng);
    const target = source + 1;
    const factor = pickRandom([-1, 1], rng);
    matrix[target] = matrix[target].map((coefficient, column) => coefficient + factor * matrix[source][column]);
  }

  return matrix.map((row) => row.map(asFraction));
}

function general3(singular, rng) {
  const matrix = generateInvertibleMatrix(3, { min: -4, max: 4, rng });
  if (singular) {
    const target = randomInteger(0, 2, rng);
    const [first, second] = matrix.filter((_, row) => row !== target);
    const factor = asFraction(pickRandom([-1, 1], rng));
    matrix[target] = first.map((coefficient, column) => coefficient.add(factor.mul(second[column])));
  }
  return matrix;
}

function solvedSystem(inverse) {
  const rows = inverse.map((row, index) =>
    [unknowns[index], "=", ...equationCellsLatex(row, rightHandSides)].join(" & "));
  return `$$\\left\\{\\begin{array}{rcrcrcr}${rows.join(" \\\\[0.45em] ")}\\end{array}\\right.$$`;
}

function compatibilityCondition(matrix) {
  // These singular matrices have rank 2. The cross product of two independent
  // columns gives the coefficients of the compatibility condition.
  const columns = transposeMatrix(matrix);
  const coefficients = [[0, 1], [0, 2], [1, 2]].map(([i, j]) =>
    [0, 1, 2].map((row) => {
      const next = (row + 1) % 3;
      const last = (row + 2) % 3;
      return columns[i][next].mul(columns[j][last]).sub(columns[i][last].mul(columns[j][next]));
    })).find((vector) => vector.some((coefficient) => !coefficient.isZero()));
  const divisor = coefficients.reduce((gcd, coefficient) => gcdBigInt(gcd, coefficient.numerator), 0n);
  const sign = coefficients.find((coefficient) => !coefficient.isZero()).numerator < 0n ? -1n : 1n;
  const normal = coefficients.map((coefficient) => coefficient.div(asFraction(sign * divisor)));
  return `$$${equationCellsLatex(normal, rightHandSides).join("")}=0.$$`;
}

function correction2(matrix, determinant, inverse) {
  const [[a, b], [c, d]] = matrix.map((row) => row.map((entry) =>
    entry.numerator < 0n ? `(${entry.toLatex()})` : entry.toLatex()));
  const calculation = `$\\det(A)=${a}\\times ${d}-${b}\\times ${c}=${determinant.toLatex()}$.`;
  const det = tr(`Le déterminant de la matrice $A$ est ${calculation}`, `The determinant of $A$ is ${calculation}`);
  return inverse
    ? tr(`${det.fr}\nPuisqu’il est non nul, on en déduit que la matrice $A$ est inversible, d’inverse\n${inverseDisplay(inverse)}`,
      `${det.en}\nSince it is nonzero, $A$ is invertible with inverse\n${inverseDisplay(inverse)}`)
    : tr(`${det.fr}\nPuisqu’il est nul, on en déduit que la matrice $A$ n’est pas inversible.`,
      `${det.en}\nSince it is zero, $A$ is not invertible.`);
}

function correction3(matrix, inverse, associatedSystem) {
  const intro = tr(`Le système associé à cette matrice est :\n${associatedSystem}`,
    `The system associated with this matrix is:\n${associatedSystem}`);
  if (!inverse) {
    const condition = compatibilityCondition(matrix);
    return tr(
      `${intro.fr}\nEn résolvant le système, on obtient la condition de compatibilité suivante :\n${condition}\nLe système n’a pas de solution unique. La matrice $A$ n’est donc pas inversible.`,
      `${intro.en}\nSolving the system gives the following condition for it to have solutions:\n${condition}\nThe system does not have a unique solution, so $A$ is not invertible.`,
    );
  }
  const solved = solvedSystem(inverse);
  return tr(
    `${intro.fr}\nOn résout le système et on obtient :\n${solved}\nLa solution est unique, donc $A$ est inversible, d’inverse\n${inverseDisplay(inverse)}`,
    `${intro.en}\nSolving the system gives:\n${solved}\nThe solution is unique, so $A$ is invertible with inverse\n${inverseDisplay(inverse)}`,
  );
}

function generateGaussInversion(level, rng) {
  const size = [2, 3, 4][Number(level) - 1] ?? 2;
  const singular = rng() < .2;
  let coefficients = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => {
      if (row === column) return singular && row === size - 1 ? "0" : String(pickRandom([-2, -1, 1, 2], rng));
      return column === row + 1 ? String(randomNonZeroInteger(-2, 2, rng)) : "0";
    }));

  // Mix adjacent rows of a small triangular matrix to keep the arithmetic manageable.
  for (let row = size - 1; row > 0; row -= 1) {
    const factor = String(pickRandom([-2, -1, 1, 2], rng));
    coefficients = rowOperation(coefficients, { type: "add", target: row, source: row - 1, factor });
  }
  if (rng() < .45) {
    const target = randomInteger(0, size - 1, rng);
    const source = (target + randomInteger(1, size - 1, rng)) % size;
    coefficients = rowOperation(coefficients, { type: "swap", target, source });
  }

  const identity = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => row === column ? "1" : "0"));
  const initialMatrix = coefficients.map((row, i) => [...row, ...identity[i]]);
  const reduced = reducedForm(initialMatrix).matrix;
  const left = reduced.map((row) => row.slice(0, size));
  const inverse = sameMatrix(left, identity) ? toFractionMatrix(reduced.map((row) => row.slice(size))) : null;
  const reducedDisplay = `$$${augmentedLatex(reduced, size)}$$`;
  const answerDisplay = inverse
    ? tr(inverseDisplay(inverse), inverseDisplay(inverse))
    : tr("$A$ n’est pas inversible.", "$A$ is not invertible.");
  const conclusion = inverse
    ? tr(`Puisque le bloc de gauche est $I_{${size}}$, la matrice $A$ est inversible, d’inverse :\n${answerDisplay.fr}`,
      `Since the left block is $I_{${size}}$, the matrix $A$ is invertible with inverse:\n${answerDisplay.en}`)
    : tr(`Puisque le bloc de gauche n’est pas $I_{${size}}$, la matrice $A$ n’est pas inversible.`,
      `Since the left block is not $I_{${size}}$, the matrix $A$ is not invertible.`);

  return {
    prompt: `$$${augmentedLatex(initialMatrix, size)}$$`,
    promptUi: {
      label: tr(
        "Déterminer si $A$ est inversible et son inverse en utilisant le pivot de Gauss",
        "Use Gaussian elimination to determine whether $A$ is invertible and find its inverse if it exists",
      ),
      icon: false,
    },
    rowWorkspace: true,
    augmentedSplit: size,
    initialMatrix,
    expected: { determinant: null, inverse, matrix: toFractionMatrix(coefficients) },
    answerDisplay,
    explanation: tr(
      `On échelonne et réduit la matrice augmentée $(A\\mid I_{${size}})$ et on obtient la matrice :\n${reducedDisplay}\n${conclusion.fr}`,
      `We row-reduce the augmented matrix $(A\\mid I_{${size}})$ and obtain:\n${reducedDisplay}\n${conclusion.en}`,
    ),
    dedupeKey: coefficients,
  };
}

export function generateMatrixInversion({ difficulty = "inverse-2x2", level = 1, rng = Math.random } = {}) {
  if (difficulty === "inverse-gauss") return generateGaussInversion(level, rng);
  const small = difficulty === "inverse-2x2";
  const singular = rng() < (small ? .25 : .2);
  const matrix = small
    ? (singular ? singular2(rng) : generateInvertibleMatrix(2, { min: -4, max: 4, rng }))
    : Number(level) >= 3 ? general3(singular, rng) : triangular3(Number(level) || 1, singular, rng);
  const determinant = small ? determinant2(matrix) : null;
  const inverse = small ? inverse2(matrix) : runMatrixInversion({ matrix }).inverseMatrix;
  const associatedSystem = small ? null : systemToLatex(matrix, unknowns, rightHandSides);
  const firstAnswer = small ? `$$\\det(A)=${determinant.toLatex()}$$` : associatedSystem;
  const lastAnswer = inverse
    ? tr(inverseDisplay(inverse), inverseDisplay(inverse))
    : tr("$A$ n’est pas inversible.", "$A$ is not invertible.");

  return {
    prompt: `$$A=${matrixToLatex(matrix).slice(2, -2)}$$`,
    promptUi: small
      ? { label: tr("Étudier l’inversibilité de $A$", "Determine whether $A$ is invertible"), icon: false }
      : { label: tr("Étudier l’inversibilité de $A$ à l’aide du système associé", "Use the associated system to determine whether $A$ is invertible"), icon: false },
    initialMatrix: matrix,
    ...(small ? {} : { unknowns, rightHandSides }),
    expected: { determinant, inverse, matrix },
    answerDisplay: tr(`${firstAnswer}\n${lastAnswer.fr}`, `${firstAnswer}\n${lastAnswer.en}`),
    explanation: small ? correction2(matrix, determinant, inverse) : correction3(matrix, inverse, associatedSystem),
    dedupeKey: matrix.map((row) => row.map(String)),
  };
}

export function validateMatrixInversionAnswer(value, { expected, lang }) {
  const invalid = (fr, en) => ({ status: "invalid", message: lang === "en" ? en : fr });
  const checksDeterminant = expected.determinant !== null;
  const matrixMatches = (input, target) => {
    if (!Array.isArray(input) || input.length !== target.length
      || input.some((row, index) => !Array.isArray(row) || row.length !== target[index].length
        || row.some((entry) => !String(entry ?? "").trim()))) {
      return invalid("Compléter tous les coefficients.", "Fill in all the entries.");
    }
    const entries = input.map((row) => row.map(asFraction));
    return entries.every((row, i) => row.every((entry, j) => entry.equals(target[i][j])));
  };

  if (value?.stage === "system" && !checksDeterminant) {
    const result = matrixMatches(value.system, expected.matrix);
    return result === true ? { status: "continue", nextAnswer: { ...value, stage: "invertibility" } } : result;
  }
  if (value?.stage === "inverse") {
    return Boolean(expected.inverse) && value.invertibility === "invertible"
      && matrixMatches(value.matrix, expected.inverse);
  }
  if (value?.stage !== (checksDeterminant ? "determinant" : "invertibility")) return false;
  if (checksDeterminant && !String(value.determinant ?? "").trim()) {
    return invalid("Saisir le déterminant.", "Enter the determinant.");
  }
  if (!["invertible", "singular"].includes(value.invertibility)) {
    return invalid("Indiquer si la matrice est inversible.", "Choose whether the matrix is invertible.");
  }
  const determinantOk = !checksDeterminant || asFraction(value.determinant).equals(expected.determinant);
  const invertibilityOk = (value.invertibility === "invertible") === Boolean(expected.inverse);
  if (!determinantOk || !invertibilityOk) return false;
  if (!expected.inverse) return true;
  return {
    status: "continue",
    nextAnswer: { ...value, stage: "inverse", matrix: expected.matrix.map((row) => row.map(() => "")) },
  };
}

export const matrixInversionTool = {
  id: "inversion-matrices",
  categoryId: "matrices",
  mode: "practice",
  title: tr("Inversion de matrices", "Matrix inversion"),
  description: tr("Étudier l’inversibilité et calculer la matrice inverse.", "Determine whether a matrix is invertible and find its inverse."),
  exercises: [
    {
      id: "inverse-2x2", color: "sky",
      label: tr("Inversion d’une matrice $2\\times2$", "Inverting a $2\\times2$ matrix"),
      description: tr("Calculer le déterminant et en déduire l’inverse.", "Use the determinant to find the inverse."),
    },
    {
      id: "inverse-3x3", color: "violet", levels: [1, 2, 3],
      label: tr("Inversion d’une matrice $3\\times3$", "Inverting a $3\\times3$ matrix"),
      description: tr(
        "Déterminer le système associé, le résoudre et en déduire l’inverse s’il existe.",
        "Set up and solve the associated system to find the inverse, if it exists.",
      ),
    },
    {
      id: "inverse-gauss", color: "emerald", levels: [1, 2, 3],
      label: tr("Inversion par pivot de Gauss", "Inversion by Gaussian elimination"),
      description: tr(
        "Obtenir l’échelonnée réduite et lire l’inverse s’il existe.",
        "Find the reduced row echelon form and read off the inverse, if it exists.",
      ),
    },
  ],
  defaultExercise: "inverse-2x2",
  exerciseColumns: 3,
  timer: false,
  score: true,
  series: { questionCount: 2, choices: [1, 2, 5, 10], allowQuestionCount: true, allowRestart: true, showSummary: true },
  source: { type: "generator", generate: generateMatrixInversion },
  answer: { type: "matrix-inversion", validator: validateMatrixInversionAnswer },
  feedback: { showCorrection: false, showExplanation: true, nextQuestion: true },
  courseHintIds: ["matrix-inverse"],
};
