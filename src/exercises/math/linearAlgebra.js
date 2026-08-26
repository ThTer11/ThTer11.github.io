import {
  runGaussianElimination,
} from "../../utils/gauss";
import { randomInteger } from "../core/random";
import { asFraction, Fraction } from "./rational";

function assertPositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} doit être un entier strictement positif.`);
  }
}

function assertRowIndex(index, rowCount, label) {
  if (!Number.isSafeInteger(index) || index < 0 || index >= rowCount) {
    throw new Error(`${label} ne désigne pas une ligne de la matrice.`);
  }
}

// Contrairement à une boucle « tirer jusqu'à obtenir autre chose que zéro »,
// cette sélection termine aussi avec un RNG injecté constant dans les tests.
function randomNonZeroInRange(min, max, rng) {
  if (min > 0 || max < 0) {
    return randomInteger(min, max, rng);
  }

  const negativeCount = Math.max(0, -min);
  const positiveCount = Math.max(0, max);
  const available = negativeCount + positiveCount;

  if (available === 0) {
    throw new Error("L'intervalle ne contient aucun entier non nul.");
  }

  const index = randomInteger(0, available - 1, rng);
  return index < negativeCount ? min + index : index - negativeCount + 1;
}

/**
 * Convertit une matrice en rationnels exacts et vérifie qu'elle est
 * rectangulaire. La matrice d'origine n'est jamais modifiée.
 */
export function toFractionMatrix(matrix, label = "La matrice") {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new Error(`${label} doit contenir au moins une ligne.`);
  }

  if (!Array.isArray(matrix[0]) || matrix[0].length === 0) {
    throw new Error(`${label} doit contenir au moins une colonne.`);
  }

  const columnCount = matrix[0].length;

  if (matrix.some((row) => !Array.isArray(row) || row.length !== columnCount)) {
    throw new Error(`${label} doit être rectangulaire.`);
  }

  return matrix.map((row) => row.map((value) => asFraction(value)));
}

/** Renvoie les dimensions sous une forme explicite. */
export function matrixDimensions(matrix) {
  const normalized = toFractionMatrix(matrix);
  return { rows: normalized.length, columns: normalized[0].length };
}

/** Variante pratique pour les champs de réponse : [nombre de lignes, colonnes]. */
export function matrixShape(matrix) {
  const { rows, columns } = matrixDimensions(matrix);
  return [rows, columns];
}

function normalizeDimensions(value, label) {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => Number.isSafeInteger(entry) && entry > 0)
  ) {
    return { rows: value[0], columns: value[1] };
  }

  if (
    value &&
    !Array.isArray(value) &&
    Number.isSafeInteger(value.rows) &&
    Number.isSafeInteger(value.columns) &&
    value.rows > 0 &&
    value.columns > 0
  ) {
    return { rows: value.rows, columns: value.columns };
  }

  try {
    return matrixDimensions(value);
  } catch (error) {
    throw new Error(`${label} doit être une matrice ou une paire de dimensions valide.`);
  }
}

export function isMatrixProductDefined(left, right) {
  const leftDimensions = normalizeDimensions(left, "Le premier facteur");
  const rightDimensions = normalizeDimensions(right, "Le second facteur");
  return leftDimensions.columns === rightDimensions.rows;
}

export function matrixProductDimensions(left, right) {
  const leftDimensions = normalizeDimensions(left, "Le premier facteur");
  const rightDimensions = normalizeDimensions(right, "Le second facteur");

  if (leftDimensions.columns !== rightDimensions.rows) {
    return null;
  }

  return [leftDimensions.rows, rightDimensions.columns];
}

/** Produit matriciel exact, y compris pour des coefficients fractionnaires. */
export function multiplyMatrices(left, right) {
  const first = toFractionMatrix(left, "La première matrice");
  const second = toFractionMatrix(right, "La seconde matrice");
  const [leftRows, leftColumns] = matrixShape(first);
  const [rightRows, rightColumns] = matrixShape(second);

  if (leftColumns !== rightRows) {
    throw new Error(
      `Produit impossible : ${leftColumns} colonnes à gauche, mais ${rightRows} lignes à droite.`,
    );
  }

  return Array.from({ length: leftRows }, (_, row) =>
    Array.from({ length: rightColumns }, (_, column) => {
      let sum = Fraction.zero();

      for (let index = 0; index < leftColumns; index += 1) {
        sum = sum.add(first[row][index].mul(second[index][column]));
      }

      return sum;
    }),
  );
}

export function determinant2(matrix) {
  const values = toFractionMatrix(matrix);

  if (values.length !== 2 || values[0].length !== 2) {
    throw new Error("Le déterminant 2 × 2 attend une matrice de taille 2 × 2.");
  }

  return values[0][0].mul(values[1][1]).sub(values[0][1].mul(values[1][0]));
}

export function determinant3(matrix) {
  const values = toFractionMatrix(matrix);

  if (values.length !== 3 || values[0].length !== 3) {
    throw new Error("Le déterminant 3 × 3 attend une matrice de taille 3 × 3.");
  }

  const [a, b, c] = values[0];
  const [d, e, f] = values[1];
  const [g, h, i] = values[2];

  return a.mul(e.mul(i).sub(f.mul(h)))
    .sub(b.mul(d.mul(i).sub(f.mul(g))))
    .add(c.mul(d.mul(h).sub(e.mul(g))));
}

/**
 * Déterminant exact par développement de Laplace. Les exercices actuels
 * n'utilisent que les tailles 2 et 3, mais cette fonction reste réutilisable.
 */
export function determinant(matrix) {
  const values = toFractionMatrix(matrix);

  if (values.length !== values[0].length) {
    throw new Error("Le déterminant n'est défini que pour une matrice carrée.");
  }

  if (values.length === 1) {
    return values[0][0];
  }

  if (values.length === 2) {
    return determinant2(values);
  }

  if (values.length === 3) {
    return determinant3(values);
  }

  return values[0].reduce((sum, coefficient, column) => {
    const minor = values.slice(1).map((row) =>
      row.filter((_, currentColumn) => currentColumn !== column));
    const term = coefficient.mul(determinant(minor));
    return column % 2 === 0 ? sum.add(term) : sum.sub(term);
  }, Fraction.zero());
}

/** Renvoie null lorsque la matrice 2 × 2 est singulière. */
export function inverse2(matrix) {
  const values = toFractionMatrix(matrix);

  if (values.length !== 2 || values[0].length !== 2) {
    throw new Error("L'inverse 2 × 2 attend une matrice de taille 2 × 2.");
  }

  const det = determinant2(values);

  if (det.isZero()) {
    return null;
  }

  const inverseDeterminant = Fraction.one().div(det);
  return [
    [values[1][1].mul(inverseDeterminant), values[0][1].neg().mul(inverseDeterminant)],
    [values[1][0].neg().mul(inverseDeterminant), values[0][0].mul(inverseDeterminant)],
  ];
}

export function transposeMatrix(matrix) {
  const values = toFractionMatrix(matrix);
  return Array.from({ length: values[0].length }, (_, column) =>
    values.map((row) => row[column]));
}

export function matrixVectorProduct(matrix, vector) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Le vecteur doit contenir au moins une coordonnée.");
  }

  const result = multiplyMatrices(matrix, vector.map((value) => [value]));
  return result.map(([value]) => value);
}

export function augmentMatrix(matrix, rightHandSide) {
  const values = toFractionMatrix(matrix);

  if (!Array.isArray(rightHandSide) || rightHandSide.length !== values.length) {
    throw new Error("Le second membre doit avoir une valeur par ligne.");
  }

  return values.map((row, index) => [...row, asFraction(rightHandSide[index])]);
}

function randomMatrixOptions(rawOptions, rawRng) {
  if (typeof rawOptions === "function") {
    return { rng: rawOptions };
  }

  return { ...(rawOptions ?? {}), ...(rawRng ? { rng: rawRng } : {}) };
}

/** Génère une petite matrice entière en utilisant exclusivement le RNG fourni. */
export function generateIntegerMatrix(rows, columns, rawOptions = {}, rawRng) {
  assertPositiveInteger(rows, "Le nombre de lignes");
  assertPositiveInteger(columns, "Le nombre de colonnes");

  const options = randomMatrixOptions(rawOptions, rawRng);
  const {
    min = -3,
    max = 3,
    allowZero = true,
    zeroProbability = null,
    rng = Math.random,
  } = options;

  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max) {
    throw new Error("L'intervalle des coefficients entiers est invalide.");
  }

  if (!allowZero && min === 0 && max === 0) {
    throw new Error("L'intervalle doit contenir un entier non nul.");
  }

  if (
    zeroProbability !== null &&
    (typeof zeroProbability !== "number" || zeroProbability < 0 || zeroProbability > 1)
  ) {
    throw new Error("La probabilité d'obtenir zéro doit être comprise entre 0 et 1.");
  }

  return Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => {
      if (allowZero && zeroProbability !== null && rng() < zeroProbability) {
        return Fraction.zero();
      }

      const value = allowZero
        ? randomInteger(min, max, rng)
        : randomNonZeroInRange(min, max, rng);
      return asFraction(value);
    }),
  );
}

/**
 * Génère une matrice carrée inversible. Une matrice diagonale de secours évite
 * toute boucle infinie avec un RNG de test constant.
 */
export function generateInvertibleMatrix(size, rawOptions = {}, rawRng) {
  assertPositiveInteger(size, "La taille");
  const options = randomMatrixOptions(rawOptions, rawRng);
  const { min = -3, max = 3, rng = Math.random, maxAttempts = 40 } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateIntegerMatrix(size, size, { ...options, rng });

    if (!determinant(candidate).isZero()) {
      return candidate;
    }
  }

  if (min === 0 && max === 0) {
    throw new Error("L'intervalle ne permet pas de construire une matrice inversible.");
  }

  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => {
      if (row !== column) {
        return Fraction.zero();
      }

      return asFraction(randomNonZeroInRange(min, max, rng));
    }),
  );
}

export function generateUniqueSystem(variableCount = 2, rawOptions = {}, rawRng) {
  if (![2, 3].includes(variableCount)) {
    throw new Error("Les générateurs pédagogiques prennent en charge 2 ou 3 inconnues.");
  }

  const options = randomMatrixOptions(rawOptions, rawRng);
  const {
    min = -3,
    max = 3,
    solutionMin = -4,
    solutionMax = 4,
    rng = Math.random,
  } = options;
  const coefficients = generateInvertibleMatrix(variableCount, { min, max, rng });
  const solution = Array.from({ length: variableCount }, () =>
    asFraction(randomInteger(solutionMin, solutionMax, rng)));
  const constants = matrixVectorProduct(coefficients, solution);
  const variableNames = ["x", "y", "z"].slice(0, variableCount);

  return {
    variableNames,
    coefficients,
    constants,
    augmentedMatrix: augmentMatrix(coefficients, constants),
    solution,
  };
}

/**
 * Applique une opération élémentaire, avec des indices de lignes commençant à
 * zéro. `add` signifie L_target <- L_target + factor L_source.
 */
export function applyRowOperation(matrix, operation) {
  const values = toFractionMatrix(matrix);
  const rowCount = values.length;
  const type = operation?.type;

  if (type === "swap") {
    const first = operation.rows?.[0] ?? operation.row;
    const second = operation.rows?.[1] ?? operation.withRow;
    assertRowIndex(first, rowCount, "La première ligne");
    assertRowIndex(second, rowCount, "La seconde ligne");
    [values[first], values[second]] = [values[second], values[first]];
    return values;
  }

  if (type === "scale") {
    assertRowIndex(operation.row, rowCount, "La ligne");
    const factor = asFraction(operation.factor);

    if (factor.isZero()) {
      throw new Error("Une opération élémentaire ne peut pas multiplier une ligne par zéro.");
    }

    values[operation.row] = values[operation.row].map((value) => value.mul(factor));
    return values;
  }

  if (type === "add" || type === "combine") {
    const target = operation.target ?? operation.row;
    const source = operation.source ?? operation.withRow;
    assertRowIndex(target, rowCount, "La ligne cible");
    assertRowIndex(source, rowCount, "La ligne source");
    const factor = asFraction(operation.factor ?? 1);
    values[target] = values[target].map((value, column) =>
      value.add(values[source][column].mul(factor)));
    return values;
  }

  throw new Error(`Opération de ligne inconnue : ${type ?? "non précisée"}.`);
}

export function rowOperationToLatex(operation) {
  const line = (index) => `L_{${index + 1}}`;

  if (operation.type === "swap") {
    const first = operation.rows?.[0] ?? operation.row;
    const second = operation.rows?.[1] ?? operation.withRow;
    return `${line(first)}\\leftrightarrow ${line(second)}`;
  }

  if (operation.type === "scale") {
    const factor = asFraction(operation.factor);
    return `${line(operation.row)}\\leftarrow ${factor.toLatex()}${line(operation.row)}`;
  }

  const target = operation.target ?? operation.row;
  const source = operation.source ?? operation.withRow;
  const factor = asFraction(operation.factor ?? 1);
  const sign = factor.numerator < 0n ? "-" : "+";
  const absolute = factor.abs();
  const coefficient = absolute.isOne() ? "" : absolute.toLatex();
  return `${line(target)}\\leftarrow ${line(target)}${sign}${coefficient}${line(source)}`;
}

/**
 * Réutilise le moteur de Gauss déjà présent sur le site. Accepte soit l'objet
 * `{ variableNames, augmentedMatrix }`, soit coefficients + second membre.
 */
export function solveLinearSystem(systemOrCoefficients, constants, variableNames) {
  if (
    systemOrCoefficients &&
    !Array.isArray(systemOrCoefficients) &&
    Array.isArray(systemOrCoefficients.augmentedMatrix)
  ) {
    return runGaussianElimination({
      variableNames: systemOrCoefficients.variableNames,
      augmentedMatrix: toFractionMatrix(systemOrCoefficients.augmentedMatrix),
    });
  }

  const coefficients = toFractionMatrix(systemOrCoefficients, "La matrice des coefficients");
  const names = variableNames ?? Array.from(
    { length: coefficients[0].length },
    (_, index) => `x${index + 1}`,
  );

  return runGaussianElimination({
    variableNames: names,
    augmentedMatrix: augmentMatrix(coefficients, constants),
  });
}

export function matricesEqual(left, right) {
  try {
    const first = toFractionMatrix(left);
    const second = toFractionMatrix(right);
    return first.length === second.length &&
      first[0].length === second[0].length &&
      first.every((row, rowIndex) => row.every((value, columnIndex) =>
        value.equals(second[rowIndex][columnIndex])));
  } catch (error) {
    return false;
  }
}

// Alias explicites utiles dans les petits générateurs ajoutés ultérieurement.
export const canMultiplyMatrices = isMatrixProductDefined;
export const productDimensions = matrixProductDimensions;
export const determinant2x2 = determinant2;
export const determinant3x3 = determinant3;
export const inverse2x2 = inverse2;
