import { matrixToLatex, systemToLatex } from "../../utils/gauss";
import { pickRandom, randomInteger, randomNonZeroInteger } from "../core/random";
import { splitSet, validateAnswer } from "../core/validators";
import {
  determinant2, generateIntegerMatrix, inverse2, matricesEqual, matrixVectorProduct,
  multiplyMatrices, toFractionMatrix, transposeMatrix,
} from "../math/linearAlgebra";
import { asFraction, Fraction } from "../math/rational";
import { characteristicPolynomialLatex, eigenSystem, isEigenvector, signedTermLatex } from "../math/spectral";
import {
  matchesMatrixPower, matchesPowerExpression, matrixPowerTerms, matrixPowerVectorTerms, powerTermsToLatex,
} from "../math/spectralPower";

const tr = (fr, en) => ({ fr, en });
const matrixLatex = (matrix) => matrixToLatex(matrix).slice(2, -2);
const columnLatex = (vector) => matrixLatex(vector.map((entry) => [entry]));
const namedMatrix = (name, matrix) => `$$${name}=${matrixLatex(matrix)}$$`;
const symbolicMatrixLatex = (matrix) =>
  `\\begin{pmatrix}${matrix.map((row) => row.join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;

function generateRecognition(rng) {
  const size = rng() < .5 ? 2 : 3;
  const anchor = randomInteger(0, size - 1, rng);
  const vector = Array.from({ length: size }, (_, index) =>
    asFraction(index === anchor ? pickRandom([-1, 1], rng) : randomInteger(-2, 2, rng)));
  const eigenvalue = asFraction(randomInteger(-4, 4, rng));
  const seed = generateIntegerMatrix(size, size, { min: -2, max: 2, rng });
  const matrix = seed.map((row, i) => {
    const rest = row.reduce((sum, coefficient, j) => j === anchor ? sum : sum.add(coefficient.mul(vector[j])), Fraction.zero());
    return row.map((coefficient, j) => j === anchor
      ? eigenvalue.mul(vector[i]).sub(rest).div(vector[anchor])
      : coefficient);
  });
  const isEigen = rng() >= .1;
  const differentRow = (anchor + randomInteger(1, size - 1, rng)) % size;
  if (!isEigen) matrix[differentRow][anchor] = matrix[differentRow][anchor].add(pickRandom([-1, 1], rng));
  const product = matrixVectorProduct(matrix, vector);
  const av = `Av=${columnLatex(product)}`;
  const computed = `On note que\n$$${av}.$$`;
  const computedEn = `We have\n$$${av}.$$`;
  const lambda = eigenvalue.toLatex();
  const multiple = eigenvalue.isZero() ? "0v" : signedTermLatex(eigenvalue, "v").replace(/^\+/, "");
  const equations = [anchor, differentRow].map((row) =>
    `${signedTermLatex(vector[row], "k").replace(/^\+/, "") || "0"}&=${product[row].toLatex()}`);
  const conflict = vector[differentRow].isZero()
    ? `$0=${product[differentRow].toLatex()}$`
    : `$k=${lambda}$ et $k=${product[differentRow].div(vector[differentRow]).toLatex()}$`;
  const conflictEn = conflict.replace(" et ", " and ");
  const answerDisplay = isEigen
    ? tr(`Oui, la valeur propre associée est $${lambda}$.`, `Yes, the corresponding eigenvalue is $${lambda}$.`)
    : tr("$v$ n’est pas un vecteur propre de $A$.", "$v$ is not an eigenvector of $A$.");
  return {
    spectralTask: "recognition",
    prompt: `<div class="exercise-matrix-givens"><div>${namedMatrix("A", matrix)}</div><div>$$v=${columnLatex(vector)}$$</div></div>`,
    trustedHtml: true,
    expected: { matrix, vector, isEigen, eigenvalue },
    answerDisplay,
    explanation: isEigen
      ? tr(
        `On note que\n$$${av}=${multiple}.$$\nIl vient que $v$ est un vecteur propre de $A$ de valeur propre associée $${lambda}$.`,
        `We have\n$$${av}=${multiple}.$$\nTherefore $v$ is an eigenvector of $A$ with eigenvalue $${lambda}$.`,
      )
      : tr(
        `${computed}\nSupposons par l’absurde qu’il existe $k\\in\\mathbb R$ tel que\n$$${av}=kv.$$\nAlors\n$$\\left\\{\\begin{aligned}${equations.join("\\\\")}\\end{aligned}\\right.$$\nd’où ${conflict}, ce qui est impossible. Il vient que $v$ n’est pas un vecteur propre de $A$.`,
        `${computedEn}\nSuppose for contradiction that there is a $k\\in\\mathbb R$ such that\n$$${av}=kv.$$\nThen\n$$\\left\\{\\begin{aligned}${equations.join("\\\\")}\\end{aligned}\\right.$$\nwhich gives ${conflictEn}, a contradiction. Therefore $v$ is not an eigenvector of $A$.`,
      ),
    dedupeKey: { matrix, vector },
  };
}

function generateSpectrum(rng, repeated, task) {
  const coupled = task === "recurrence";
  const smallCoefficients = task === "power" || coupled;
  const roots = smallCoefficients ? [-2, -1, 1, 2, 3] : [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const first = pickRandom(roots, rng);
  const choices = roots.filter((candidate) => candidate !== first && Math.abs(candidate - first) <= 4);
  const second = repeated ? first : pickRandom(choices, rng);
  const limit = smallCoefficients ? 1 : 2;
  const shear = randomNonZeroInteger(-limit, limit, rng);
  const other = coupled ? shear : pickRandom([-1, 0, 1], rng);
  const basis = [[1, shear], [other, 1 + shear * other]];
  const alternate = rng() < .5;
  if (coupled && alternate) basis.reverse();
  const change = !coupled && alternate ? transposeMatrix(basis) : toFractionMatrix(basis);
  const block = [[first, repeated ? randomNonZeroInteger(-2, 2, rng) : 0], [0, second]];
  return {
    matrix: multiplyMatrices(multiplyMatrices(change, block), inverse2(change)),
    eigenvalues: (repeated ? [first] : [first, second]).map(String),
    vectors: transposeMatrix(change),
  };
}

function recurrenceInitial(basis, rng) {
  // Both eigenspaces contribute, and the initial values and powers keep small coefficients.
  const coefficients = [-2, -1, 1, 2];
  const choices = coefficients.flatMap((a) => coefficients.map((b) => matrixVectorProduct(basis, [a, b])))
    .filter((vector) => vector.every((value) => value.abs().numerator <= 2n));
  return pickRandom(choices, rng);
}

function recurrencePrompt(matrix, initial) {
  const equations = matrix.map((row, index) => {
    const expression = (signedTermLatex(row[0], "u_n") + signedTermLatex(row[1], "v_n")).replace(/^\+/, "");
    return `${index === 0 ? "u" : "v"}_{n+1}=${expression}`;
  });
  return `$$\\begin{cases}${equations.join("\\\\")}\\end{cases}$$\n$$u_0=${initial[0].toLatex()},\\qquad v_0=${initial[1].toLatex()}$$`;
}

function characteristicExplanation(matrix, polynomial, eigenvalues) {
  const determinantRows = matrix.map((row, i) => row.map((entry, j) => i === j
    ? `\\lambda${signedTermLatex(entry.neg())}` : entry.neg().toLatex()).join(" & "));
  const formula = `$$\\chi_A(\\lambda)=\\det(\\lambda I_2-A)=\\left|\\begin{array}{cc}${determinantRows.join("\\\\")}\\end{array}\\right|=${polynomial}.$$`;
  const roots = eigenvalues.map((value) => `$${value}$`).join(" et ");
  const rootSentence = eigenvalues.length === 1
    ? tr(`Ce polynôme a une racine double, ${roots}. C’est donc la seule valeur propre de $A$.`,
      `This polynomial has a double root, ${roots}, which is the only eigenvalue of $A$.`)
    : tr(`Les valeurs propres de $A$ sont les racines de ce polynôme, c’est-à-dire ${roots}.`,
      `The eigenvalues of $A$ are the roots of this polynomial, namely ${roots.replace(" et ", " and ")}.`);
  return tr(
    `Soit $\\lambda\\in\\mathbb R$.\nLe polynôme caractéristique de $A$ est\n${formula}\n${rootSentence.fr}`,
    `Let $\\lambda\\in\\mathbb R$.\nThe characteristic polynomial of $A$ is\n${formula}\n${rootSentence.en}`,
  );
}

function powerCorrection(p, ordered) {
  const { diagonalLatex, productLatex, resultLatex } = matrixPowerTerms(p, ordered);
  const finalMatrix = symbolicMatrixLatex(resultLatex);
  const calculation = [
    `A^n&=&P${symbolicMatrixLatex(diagonalLatex)}P^{-1}`,
    `&=&${symbolicMatrixLatex(productLatex)}P^{-1}`,
    `A^n&=&${finalMatrix}.`,
  ];
  const display = `$$\\begin{array}{rcl}${calculation.join("\\\\[.5em]")}\\end{array}$$`;
  return {
    answerDisplay: `$$A^n=${finalMatrix}$$`,
    explanation: tr(
      `\nSoit $n\\in\\mathbb N$. Comme $A^n=PD^nP^{-1}$, on a donc :\n${display}`,
      `\nLet $n\\in\\mathbb N$. Since $A^n=PD^nP^{-1}$, we get:\n${display}`,
    ),
  };
}

function recurrenceCorrection(basis, ordered, initial) {
  const sequences = matrixPowerVectorTerms(basis, ordered, initial).map(powerTermsToLatex);
  const result = symbolicMatrixLatex(sequences.map((value) => [value]));
  const vector = `$$X_n=A^nX_0=${result}.$$`;
  const answerDisplay = `$$\\begin{aligned}u_n&=${sequences[0]}\\\\v_n&=${sequences[1]}\\end{aligned}$$`;
  return {
    answerDisplay,
    explanation: tr(
      `\nAinsi, avec $X_0=${columnLatex(initial)}$,\n${vector}\nOn en déduit que\n${answerDisplay}`,
      `\nThus, with $X_0=${columnLatex(initial)}$,\n${vector}\nIt follows that\n${answerDisplay}`,
    ),
  };
}

function spectralCorrection(task, expected, submitted = {}) {
  const { matrix, polynomial, eigenvalues, vectors } = expected;
  const ordered = submitted.orderedEigenvalues ?? eigenvalues;
  const characteristicText = characteristicExplanation(matrix, polynomial, ordered);
  const rootDisplay = `$$\\left\\{${ordered.join(",\\;")}\\right\\}$$`;
  if (task === "eigenvalues") {
    return {
      explanation: characteristicText,
      answerDisplay: `$$\\chi_A(\\lambda)=${polynomial}$$\n${rootDisplay}`,
    };
  }

  const orderedVectors = ordered.map((root) => vectors[eigenvalues.indexOf(root)]);
  const details = ordered.map((root, i) => {
    const system = systemToLatex(eigenSystem(matrix, root), ["x", "y"]);
    const vector = `$$${columnLatex(orderedVectors[i])}$$`;
    return tr(
      `Pour $\\lambda=${root}$, l’équation $AX=${signedTermLatex(asFraction(root), "X").replace(/^\+/, "") || "0"}$ s’écrit :\n${system}\nUne solution non nulle de ce système est\n${vector}`,
      `For $\\lambda=${root}$, the equation $AX=\\lambda X$ becomes:\n${system}\nOne nonzero solution is\n${vector}`,
    );
  });
  const vectorPair = orderedVectors.map(columnLatex);
  const conclusion = tr(
    `Deux vecteurs propres de $A$ sont\n$$${vectorPair.join("\\qquad\\text{et}\\qquad")}.$$`,
    `Two eigenvectors of $A$ are\n$$${vectorPair.join("\\qquad\\text{and}\\qquad")}.$$`,
  );
  let answerDisplay = `${rootDisplay}\n$$${vectorPair.join(",\\qquad ")}.$$`;
  let finalStep = tr("", "");
  const recurrence = task === "recurrence";
  const initialMatrix = recurrence ? namedMatrix("A", matrix) : "";
  const intro = recurrence ? tr(
    `On écrit le système sous la forme $X_{n+1}=AX_n$ avec\n${initialMatrix}\nDiagonalisons $A$.\n`,
    `Write the system as $X_{n+1}=AX_n$ with\n${initialMatrix}\nNow diagonalise $A$.\n`,
  ) : tr("", "");
  if (task === "diagonalize" || task === "power" || recurrence) {
    const basis = transposeMatrix(orderedVectors);
    const p = namedMatrix("P", basis);
    const d = namedMatrix("D", toFractionMatrix([[ordered[0], 0], [0, ordered[1]]]));
    finalStep = tr(
      `\nLes colonnes de $P$ sont les vecteurs propres de $A$ :\n${p}\nLa matrice $D$ contient les valeurs propres dans l’ordre des vecteurs propres :\n${d}`,
      `\nThe columns of $P$ are eigenvectors of $A$:\n${p}\nThe diagonal entries of $D$ are the eigenvalues in the order of the corresponding eigenvectors:\n${d}`,
    );
    answerDisplay = `${p}\n${d}`;
    if (task === "power" || recurrence) {
      const power = powerCorrection(basis, ordered);
      finalStep = tr(finalStep.fr + power.explanation.fr, finalStep.en + power.explanation.en);
      if (submitted.stage !== "power-decomposition") answerDisplay = power.answerDisplay;
    }
    if (recurrence) {
      const solution = recurrenceCorrection(basis, ordered, expected.initial);
      finalStep = tr(finalStep.fr + solution.explanation.fr, finalStep.en + solution.explanation.en);
      if (submitted.stage === "recurrence-matrix") answerDisplay = initialMatrix;
      if (!submitted.stage || submitted.stage === "recurrence-sequences") answerDisplay = solution.answerDisplay;
    }
  }
  return {
    answerDisplay,
    explanation: tr(
      `${intro.fr}${characteristicText.fr}\n${details.map((part) => part.fr).join("\n")}\n${conclusion.fr}${finalStep.fr}`,
      `${intro.en}${characteristicText.en}\n${details.map((part) => part.en).join("\n")}\n${conclusion.en}${finalStep.en}`,
    ),
  };
}

export function generateDiagonalisation({ difficulty = "recognition", rng = Math.random } = {}) {
  if (difficulty === "recognition") return generateRecognition(rng);
  const recurrence = difficulty === "recurrence";
  const expected = generateSpectrum(rng, difficulty === "eigenvalues" && rng() < .2, difficulty);
  const { matrix } = expected;
  if (recurrence) expected.initial = recurrenceInitial(transposeMatrix(expected.vectors), rng);
  expected.polynomialCoefficients = [matrix[0][0].add(matrix[1][1]).neg(), determinant2(matrix)];
  expected.polynomial = characteristicPolynomialLatex(expected.polynomialCoefficients);
  const promptLabel = {
    eigenvalues: tr("Déterminer les valeurs propres de $A$", "Find the eigenvalues of $A$"),
    eigenvectors: tr("Déterminer les valeurs propres et les vecteurs propres associés de $A$", "Find the eigenvalues and corresponding eigenvectors of $A$"),
    diagonalize: tr("Déterminer $P$ inversible et $D$ diagonale telles que $A=PDP^{-1}$", "Find an invertible $P$ and a diagonal $D$ such that $A=PDP^{-1}$"),
    power: tr("Diagonaliser $A$ puis en déduire $A^n$ pour tout $n\\in\\mathbb N$", "Diagonalise $A$ and hence find $A^n$ for every $n\\in\\mathbb N$"),
    recurrence: tr("Exprimer $u_n$ et $v_n$ en fonction de $n\\in\\mathbb N$", "Express $u_n$ and $v_n$ in terms of $n\\in\\mathbb N$"),
  };
  return {
    spectralTask: difficulty,
    prompt: recurrence ? recurrencePrompt(matrix, expected.initial) : namedMatrix("A", matrix),
    promptUi: { label: promptLabel[difficulty], icon: false },
    expected,
    ...spectralCorrection(difficulty, expected),
    reviewAnswer: (submitted) => spectralCorrection(difficulty, expected, submitted),
    dedupeKey: recurrence ? { matrix, initial: expected.initial } : matrix,
  };
}

const blank = (rows, columns) => Array.from({ length: rows }, () => Array(columns).fill(""));
const incomplete = (entries) => entries.flat(Infinity).some((entry) => !String(entry ?? "").trim());
const invalid = (lang, fr, en) => ({ status: "invalid", message: lang === "en" ? en : fr });
const continueWith = (value, stage, fields = {}) => ({ status: "continue", nextAnswer: { ...value, stage, ...fields } });

export function emptySpectralAnswer(question) {
  if (question.spectralTask === "recognition") return { stage: "recognition", decision: "", eigenvalue: "" };
  if (question.spectralTask === "eigenvalues") {
    return { stage: "polynomial", polynomialCoefficients: ["", ""], eigenvalues: "" };
  }
  if (question.spectralTask === "power") return { stage: "power-decomposition", P: blank(2, 2), D: blank(2, 2) };
  if (question.spectralTask === "recurrence") return { stage: "recurrence-matrix", A: blank(2, 2) };
  return { stage: "eigenvalues", eigenvalues: "" };
}

function checkSystem(system, vector) {
  return system.some((row) => row.slice(0, 2).some((entry) => !entry.isZero()))
    && system.every(([x, y, rhs]) => rhs.isZero() && x.mul(vector[0]).add(y.mul(vector[1])).isZero());
}

export function validateSpectralAnswer(value, { expected, question, lang }) {
  const task = question.spectralTask;
  if (value.stage === "recognition") {
    if (!["yes", "no"].includes(value.decision)) return invalid(lang, "Choisir Oui ou Non.", "Choose Yes or No.");
    if ((value.decision === "yes") !== expected.isEigen) return false;
    return expected.isEigen ? continueWith(value, "eigenvalue") : true;
  }
  if (value.stage === "eigenvalue") return validateAnswer(value.eigenvalue, { type: "fraction" }, expected.eigenvalue, {}, lang);
  if (value.stage === "polynomial") {
    if (value.polynomialCoefficients?.length !== 2
      || value.polynomialCoefficients.some((entry) => !String(entry ?? "").trim())) {
      return invalid(lang, "Saisir les deux coefficients.", "Enter both coefficients.");
    }
    const coefficients = value.polynomialCoefficients.map(asFraction);
    const correct = coefficients.every((entry, i) => entry.equals(expected.polynomialCoefficients[i]));
    return correct ? continueWith(value, "eigenvalues") : false;
  }
  if (value.stage === "eigenvalues") {
    if (!value.eigenvalues.trim()) return invalid(lang, "Saisir les valeurs propres.", "Enter the eigenvalues.");
    const result = validateAnswer(value.eigenvalues, { type: "solution-set", elementType: "number" }, expected.eigenvalues, {}, lang);
    if (!result.correct || task === "eigenvalues") return result;
    const orderedEigenvalues = splitSet(value.eigenvalues).map((entry) => String(asFraction(entry)));
    return continueWith(value, "eigenpairs", {
      orderedEigenvalues,
      vectors: orderedEigenvalues.map(() => blank(2, 1)),
      ...(task === "eigenvectors" ? { systems: orderedEigenvalues.map(() => blank(2, 3)) } : {}),
    });
  }
  if (value.stage === "eigenpairs") {
    if ([value.vectors, value.systems ?? []].flat(Infinity).some((entry) => !String(entry).trim())) {
      return invalid(lang, "Compléter tous les champs.", "Complete all the fields.");
    }
    const vectors = value.vectors.map((vector) => vector.map(([entry]) => asFraction(entry)));
    const systems = value.systems?.map((system) => toFractionMatrix(system));
    const correct = value.orderedEigenvalues.every((root, i) =>
      isEigenvector(expected.matrix, vectors[i], asFraction(root))
      && (!systems || checkSystem(systems[i], vectors[i])));
    if (!correct || task === "eigenvectors") return correct;
    return continueWith(value, "diagonalization", { P: blank(2, 2), D: blank(2, 2) });
  }
  if (value.stage === "recurrence-matrix") {
    if (incomplete(value.A)) return invalid(lang, "Compléter la matrice $A$.", "Complete the matrix $A$.");
    if (!matricesEqual(toFractionMatrix(value.A), expected.matrix)) return false;
    return continueWith(value, "power-decomposition", { P: blank(2, 2), D: blank(2, 2) });
  }
  if (value.stage === "diagonalization" || value.stage === "power-decomposition") {
    if (incomplete([value.P, value.D])) {
      return invalid(lang, "Compléter les matrices $P$ et $D$.", "Complete matrices $P$ and $D$.");
    }
    const p = toFractionMatrix(value.P);
    const d = toFractionMatrix(value.D);
    const correct = d[0][1].isZero() && d[1][0].isZero() && !determinant2(p).isZero()
      && matricesEqual(multiplyMatrices(expected.matrix, p), multiplyMatrices(p, d));
    if (!correct || value.stage === "diagonalization") return correct;
    return continueWith(value, "matrix-power", {
      orderedEigenvalues: [String(d[0][0]), String(d[1][1])],
      power: blank(2, 2),
    });
  }
  if (value.stage === "matrix-power") {
    if (incomplete(value.power)) {
      return invalid(lang, "Compléter la matrice $A^n$.", "Complete the matrix $A^n$.");
    }
    const { entries } = matrixPowerTerms(transposeMatrix(expected.vectors), expected.eigenvalues);
    const correct = matchesMatrixPower(value.power, entries);
    if (!correct || task !== "recurrence") return correct;
    return continueWith(value, "recurrence-sequences", { sequences: ["", ""] });
  }
  if (value.stage === "recurrence-sequences") {
    if (incomplete(value.sequences)) {
      return invalid(lang, "Compléter $u_n$ et $v_n$.", "Complete $u_n$ and $v_n$.");
    }
    const terms = matrixPowerVectorTerms(transposeMatrix(expected.vectors), expected.eigenvalues, expected.initial);
    return terms.map((entries, index) => matchesPowerExpression(value.sequences[index], entries)).every(Boolean);
  }
  return false;
}

export const diagonalisationTool = {
  id: "diagonalisation-matrices",
  categoryId: "matrices",
  mode: "practice",
  title: tr("Diagonalisation de matrices", "Matrix diagonalisation"),
  description: tr("Calculer des valeurs propres et des vecteurs propres, puis diagonaliser une matrice.", "Find eigenvalues and eigenvectors, then diagonalise a matrix."),
  exercises: [
    {
      id: "recognition", color: "sky",
      label: tr("Déterminer si un vecteur est un vecteur propre", "Check whether a vector is an eigenvector"),
      description: tr("Déterminer si le vecteur donné est un vecteur propre et le cas échéant donner la valeur propre associée.", "Decide whether the given vector is an eigenvector and, if so, find its eigenvalue."),
    },
    {
      id: "eigenvalues", color: "violet",
      label: tr("Déterminer les valeurs propres d’une matrice $2\\times2$", "Find the eigenvalues of a $2\\times2$ matrix"),
      description: tr("Calculer le polynôme caractéristique et en déduire les valeurs propres de la matrice donnée.", "Find the characteristic polynomial and use it to find the eigenvalues of the given matrix."),
    },
    {
      id: "eigenvectors", color: "emerald",
      label: tr("Déterminer les vecteurs propres d’une matrice $2\\times2$", "Find the eigenvectors of a $2\\times2$ matrix"),
      description: tr("Déterminer les valeurs propres de $A$ puis pour chaque valeur propre, déterminer les vecteurs propres associés.", "Find the eigenvalues of $A$ and a corresponding eigenvector for each."),
    },
    {
      id: "diagonalize", color: "gold",
      label: tr("Diagonaliser une matrice $2\\times2$", "Diagonalise a $2\\times2$ matrix"),
      description: tr(
        'Pour une matrice $A$ diagonalisable, déterminer $P$ inversible et $D$ diagonale <span class="exercise-nowrap">telle que $A=PDP^{-1}$</span>.',
        'For a diagonalisable matrix $A$, find an invertible $P$ and a diagonal $D$ <span class="exercise-nowrap">such that $A=PDP^{-1}$</span>.',
      ),
      descriptionTrustedHtml: true,
    },
    {
      id: "power", color: "sky",
      label: tr("Déterminer la puissance d’une matrice $2\\times2$", "Find the power of a $2\\times2$ matrix"),
      description: tr("Déterminer $A^n$, pour tout entier $n\\in\\mathbb N$, en diagonalisant la matrice $A$.", "Find $A^n$ for every natural number $n\\in\\mathbb N$ by diagonalising the matrix $A$."),
    },
    {
      id: "recurrence", color: "violet",
      label: tr("Résoudre un système de récurrences linéaires", "Solve a system of linear recurrences"),
      description: tr(
        "Résoudre un système de récurrences linéaires couplées portant sur deux suites réelles, en diagonalisant la matrice associée.",
        "Solve a system of coupled linear recurrences for two real sequences by diagonalising the associated matrix.",
      ),
    },
  ],
  defaultExercise: "recognition",
  fullHeightExerciseCards: true,
  timer: false,
  score: true,
  series: { questionCount: 2, choices: [1, 2, 5, 10], allowQuestionCount: true, allowRestart: true, showSummary: true },
  source: { type: "generator", generate: generateDiagonalisation },
  answer: { type: "matrix-diagonalisation", validator: validateSpectralAnswer },
  feedback: { showCorrection: false, showExplanation: true, nextQuestion: true },
  courseHintIds: [],
};
