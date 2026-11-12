import { pickRandom, shuffle } from "../core/random";
import { validateAnswer } from "../core/validators";
import { generateIntegerMatrix, multiplyMatrices } from "../math/linearAlgebra";
import { matrixToLatex } from "../../utils/gauss";

const tr = (fr, en) => ({ fr, en });
const body = (matrix) => matrixToLatex(matrix).slice(2, -2);
const symbolicMatrix = (matrix) => `\\begin{pmatrix}${matrix.map((row) => row.join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
const matrixSpace = (matrix) => `\\mathcal{M}_{${matrix.length},${matrix[0].length}}(\\mathbb{R})`;
const compatibilitySchedules = new WeakMap();

function productIsDefined(seenSignatures, rng) {
  if (!(seenSignatures instanceof Set)) return rng() >= .5;
  let blocks = compatibilitySchedules.get(seenSignatures);
  if (!blocks) {
    blocks = [];
    compatibilitySchedules.set(seenSignatures, blocks);
  }
  const blockIndex = Math.floor(seenSignatures.size / 4);
  // A session owns its shuffled blocks; duplicate retries keep the same question type.
  blocks[blockIndex] ??= shuffle([true, true, false, false], rng);
  return blocks[blockIndex][seenSignatures.size % 4];
}

function linearCombination(coefficients, variables) {
  const terms = coefficients.map((value, index) => {
    const n = Number(value);
    if (!n) return null;
    return { negative: n < 0, text: `${Math.abs(n) === 1 ? "" : Math.abs(n)}${variables[index]}` };
  }).filter(Boolean);
  return terms.map((term, index) => `${term.negative ? index ? " - " : "-" : index ? " + " : ""}${term.text}`).join("") || "0";
}

export function validateMatrixProductAnswer(value, { expected, question, lang = "fr" }) {
  if (!["possible", "impossible"].includes(value?.defined)) return {
    status: "invalid", message: lang === "en" ? "Choose whether the product is defined." : "Indiquer si le produit est défini.",
  };
  if ((value.defined === "possible") !== expected.defined) return false;
  if (!expected.defined) return true;
  if (value.stage === "compatibility") return {
    status: "continue", message: "", nextAnswer: { ...value, stage: "dimensions", size: ["", ""], matrix: [] },
  };
  if (value.stage === "dimensions") {
    if (!Array.isArray(value.size) || value.size.length !== 2 || !value.size.every((n) => /^[1-9]\d*$/.test(String(n)))) return {
      status: "invalid", message: lang === "en" ? "Enter the number of rows and columns." : "Indiquer le nombre de lignes et de colonnes.",
    };
    if (Number(value.size[0]) !== expected.matrix.length || Number(value.size[1]) !== expected.matrix[0].length) return false;
    return {
      status: "continue", message: "", nextAnswer: { ...value, stage: "matrix",
        matrix: expected.matrix.map((row) => row.map(() => "")) },
    };
  }
  if (value.stage !== "matrix" || Number(value.size?.[0]) !== expected.matrix.length || Number(value.size?.[1]) !== expected.matrix[0].length) return false;
  if (!Array.isArray(value.matrix) || value.matrix.length !== expected.matrix.length
    || value.matrix.some((row, i) => !Array.isArray(row) || row.length !== expected.matrix[i].length)) return false;
  const outcomes = value.matrix.flatMap((row, i) => row.map((cell, j) =>
    validateAnswer(cell, { type: question.symbolic ? "expression" : "integer" }, expected.matrix[i][j], {}, lang)));
  if (outcomes.some((outcome) => outcome.status === "invalid")) return {
    status: "invalid", message: lang === "en" ? "Complete each entry of the result." : "Compléter chaque coefficient du résultat.",
  };
  return outcomes.every((outcome) => outcome.correct);
}

export function generateMatrixMultiplication({ difficulty = "product", rng = Math.random, seenSignatures } = {}) {
  const symbolic = difficulty === "matrix-vector";
  const order = symbolic ? "AX" : rng() < .5 ? "AB" : "BA";
  const defined = symbolic || productIsDefined(seenSignatures, rng);
  const shapes = [[[2, 2], [2, 2]], [[2, 2], [2, 1]], [[1, 2], [2, 2]],
    [[2, 1], [1, 2]], [[3, 3], [3, 3]], [[2, 3], [3, 2]], [[3, 2], [2, 3]], [[3, 3], [3, 1]], [[2, 3], [3, 1]]];
  const availableShapes = symbolic ? shapes.filter(([left]) => left[0] > 1 && left[1] > 1) : shapes;
  const [leftShape, rightShape] = pickRandom(availableShapes, rng).map((item) => [...item]);
  if (symbolic) rightShape[1] = 1;
  if (!defined) rightShape[0] = pickRandom([1, 2, 3].filter((n) =>
    n !== leftShape[1] && !(n === 1 && rightShape[1] === 1)), rng);
  const range = { min: -3, max: 3, rng };
  const left = generateIntegerMatrix(...leftShape, range);
  const variables = ["x", "y", "z"].slice(0, rightShape[0]);
  const right = symbolic ? variables.map((v) => [v]) : generateIntegerMatrix(...rightShape, range);
  const names = order === "BA" ? ["B", "A"] : symbolic ? ["A", "X"] : ["A", "B"];
  const displayed = order === "BA" ? [["A", right], ["B", left]] : [[names[0], left], [names[1], right]];
  const prompt = `<div class="exercise-matrix-givens">${displayed.map(([name, matrix]) => `<div>$$${name}=${name === "X" ? symbolicMatrix(matrix) : body(matrix)}$$</div>`).join("")}</div>`;
  const comparison = tr(
    `On a $${displayed[0][0]}\\in${matrixSpace(displayed[0][1])}$ et $${displayed[1][0]}\\in${matrixSpace(displayed[1][1])}$.`,
    `We have $${displayed[0][0]}\\in${matrixSpace(displayed[0][1])}$ and $${displayed[1][0]}\\in${matrixSpace(displayed[1][1])}$.`,
  );
  let matrix = null, answerDisplay, explanation;
  if (defined) {
    matrix = symbolic ? left.map((row) => [linearCombination(row, variables)]) : multiplyMatrices(left, right);
    const result = symbolic ? symbolicMatrix(matrix) : body(matrix);
    answerDisplay = `$$${order}=${result}$$`;
    explanation = tr(
      `${comparison.fr}\nLe produit $${order}$ est défini si $${leftShape[1]}=${rightShape[0]}$ donc $${order}$ est possible et est de taille $${leftShape[0]}\\times${rightShape[1]}$.`,
      `${comparison.en}\nThe product $${order}$ is defined if $${leftShape[1]}=${rightShape[0]}$, so $${order}$ is possible and has size $${leftShape[0]}\\times${rightShape[1]}$.`,
    );
  } else {
    explanation = tr(`${comparison.fr}\nLe produit $${order}$ est défini si $${leftShape[1]}=${rightShape[0]}$. Ici $${leftShape[1]}\\ne${rightShape[0]}$ donc $${order}$ n’est pas possible.`, `${comparison.en}\nThe product $${order}$ is defined if $${leftShape[1]}=${rightShape[0]}$. Here $${leftShape[1]}\\ne${rightShape[0]}$, so $${order}$ is not possible.`);
  }
  return {
    prompt, trustedHtml: true, symbolic, product: order, left, right,
    expected: { defined, matrix }, inputDimensions: [leftShape[0], rightShape[1]], answerDisplay, explanation,
    promptUi: { label: symbolic ? tr("Calculer $AX$", "Compute $AX$") : tr(`Déterminer et calculer $${order}$`, `Check and compute $${order}$`), icon: false },
    dedupeKey: { order, left, right },
    courseHintIds: [],
  };
}

export const matrixProductTool = {
  id: "multiplication-matrices", categoryId: "matrices", mode: "practice",
  title: tr("Multiplication de matrices", "Matrix multiplication"),
  description: tr("Vérifier les dimensions et calculer les produits.", "Check dimensions and compute products."),
  exercises: [
    { id: "product", label: tr("Multiplication de deux matrices", "Multiplying two matrices"), description: tr("Vérifier les dimensions, puis calculer le produit demandé.", "Check the dimensions, then compute the requested product."), color: "sky" },
    { id: "matrix-vector", label: tr("Produit matrice vecteur", "Matrix-vector product"), description: tr("Multiplier une matrice par un vecteur colonne d’inconnues.", "Multiply a matrix by a column vector of unknowns."), color: "violet" },
  ],
  defaultExercise: "product", timer: false,
  exerciseColumns: 3,
  series: { questionCount: 5, choices: [5, 10, 15, 20], allowQuestionCount: true, allowRestart: true, showSummary: true },
  score: true,
  source: { type: "generator", generate: generateMatrixMultiplication },
  answer: { type: "matrix-product", validator: validateMatrixProductAnswer },
  feedback: { showCorrection: true, showExplanation: true, showCourseHintOnError: false, showInsight: false, nextQuestion: true },
  courseHintIds: [],
};
