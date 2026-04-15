function absBigInt(value) {
  return value < 0n ? -value : value;
}

function gcdBigInt(a, b) {
  let x = absBigInt(a);
  let y = absBigInt(b);

  while (y !== 0n) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }

  return x === 0n ? 1n : x;
}

export class Fraction {
  constructor(numerator, denominator = 1n) {
    if (denominator === 0n) {
      throw new Error("Zero denominator");
    }

    let num = BigInt(numerator);
    let den = BigInt(denominator);

    if (den < 0n) {
      num = -num;
      den = -den;
    }

    const divisor = gcdBigInt(num, den);
    this.numerator = num / divisor;
    this.denominator = den / divisor;
  }

  static zero() {
    return new Fraction(0n, 1n);
  }

  static one() {
    return new Fraction(1n, 1n);
  }

  static from(value) {
    if (value instanceof Fraction) {
      return value;
    }

    return parseFraction(String(value));
  }

  add(other) {
    const value = Fraction.from(other);
    return new Fraction(
      this.numerator * value.denominator + value.numerator * this.denominator,
      this.denominator * value.denominator,
    );
  }

  sub(other) {
    return this.add(Fraction.from(other).neg());
  }

  mul(other) {
    const value = Fraction.from(other);
    return new Fraction(
      this.numerator * value.numerator,
      this.denominator * value.denominator,
    );
  }

  div(other) {
    const value = Fraction.from(other);

    if (value.numerator === 0n) {
      throw new Error("Division by zero");
    }

    return new Fraction(
      this.numerator * value.denominator,
      this.denominator * value.numerator,
    );
  }

  neg() {
    return new Fraction(-this.numerator, this.denominator);
  }

  abs() {
    return new Fraction(absBigInt(this.numerator), this.denominator);
  }

  isZero() {
    return this.numerator === 0n;
  }

  isOne() {
    return this.numerator === this.denominator;
  }

  equals(other) {
    const value = Fraction.from(other);
    return (
      this.numerator === value.numerator &&
      this.denominator === value.denominator
    );
  }

  toString() {
    if (this.denominator === 1n) {
      return this.numerator.toString();
    }

    return `${this.numerator.toString()}/${this.denominator.toString()}`;
  }

  toLatex() {
    if (this.denominator === 1n) {
      return this.numerator.toString();
    }

    const sign = this.numerator < 0n ? "-" : "";
    return `${sign}\\frac{${absBigInt(this.numerator).toString()}}{${this.denominator.toString()}}`;
  }
}

function parseDecimal(decimal) {
  const trimmed = decimal.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/^[+-]/, "");
  const [integerPart, fractionPart = ""] = unsigned.split(".");
  const scale = 10n ** BigInt(fractionPart.length);
  const digits = `${integerPart || "0"}${fractionPart}`;
  const numerator = BigInt(digits || "0");
  return new Fraction(negative ? -numerator : numerator, scale);
}

export function parseFraction(rawValue) {
  const value = rawValue.trim();

  if (!value) {
    throw new Error("Empty number");
  }

  if (value.includes("/")) {
    const parts = value.split("/");

    if (parts.length !== 2) {
      throw new Error(`Invalid fraction: ${rawValue}`);
    }

    const numerator = parseFraction(parts[0]);
    const denominator = parseFraction(parts[1]);
    return numerator.div(denominator);
  }

  if (value.includes(".")) {
    return parseDecimal(value);
  }

  return new Fraction(BigInt(value), 1n);
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.map((value) => Fraction.from(value)));
}

function normalizeTokens(text) {
  return text
    .replace(/\u2212/g, "-")
    .replace(/\*/g, "")
    .replace(/\s+/g, "");
}

function parseLinearExpression(rawExpression) {
  const expression = normalizeTokens(rawExpression);

  if (!expression) {
    return { coefficients: new Map(), constant: Fraction.zero(), order: [] };
  }

  const normalized = /^[+-]/.test(expression) ? expression : `+${expression}`;
  const terms = normalized.match(/[+-][^+-]+/g) || [];
  const coefficients = new Map();
  const order = [];
  let constant = Fraction.zero();

  terms.forEach((term) => {
    const sign = term.startsWith("-") ? -1 : 1;
    const body = term.slice(1);

    if (!body) {
      throw new Error(`Terme invalide dans l'expression "${rawExpression}"`);
    }

    if (/[a-zA-Z]/.test(body)) {
      const match = body.match(
        /^((?:\d+(?:\.\d+)?|\d*\.\d+)(?:\/(?:\d+(?:\.\d+)?|\d*\.\d+))?)?([a-zA-Z][a-zA-Z0-9]*)$/,
      );

      if (!match) {
        throw new Error(`Terme linéaire invalide: "${body}"`);
      }

      const [, coefficientText, variable] = match;
      const coefficient = coefficientText ? parseFraction(coefficientText) : Fraction.one();
      const signedCoefficient = sign === -1 ? coefficient.neg() : coefficient;

      if (!coefficients.has(variable)) {
        coefficients.set(variable, Fraction.zero());
        order.push(variable);
      }

      coefficients.set(variable, coefficients.get(variable).add(signedCoefficient));
      return;
    }

    const value = parseFraction(body);
    constant = constant.add(sign === -1 ? value.neg() : value);
  });

  return { coefficients, constant, order };
}

export function parseSystemInput(rawText) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Entre au moins une équation.");
  }

  const variableNames = [];
  const variableSet = new Set();
  const equations = [];

  lines.forEach((line, index) => {
    const members = line.split("=");

    if (members.length !== 2) {
      throw new Error(`Ligne ${index + 1}: utilise exactement un signe "=".`);
    }

    const left = parseLinearExpression(members[0]);
    const right = parseLinearExpression(members[1]);

    [...left.order, ...right.order].forEach((variable) => {
      if (!variableSet.has(variable)) {
        variableSet.add(variable);
        variableNames.push(variable);
      }
    });

    equations.push({ left, right });
  });

  if (variableNames.length === 0) {
    throw new Error("Le système ne contient aucune inconnue.");
  }

  const augmentedMatrix = equations.map(({ left, right }) => {
    const row = variableNames.map((variable) => {
      const leftValue = left.coefficients.get(variable) || Fraction.zero();
      const rightValue = right.coefficients.get(variable) || Fraction.zero();
      return leftValue.sub(rightValue);
    });

    const constant = right.constant.sub(left.constant);
    return [...row, constant];
  });

  return { variableNames, augmentedMatrix };
}

export function parseMatrixInput(rawText) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Entre au moins une ligne de matrice.");
  }

  const augmentedMatrix = lines.map((line, index) => {
    const parts = line.split("|");

    if (parts.length !== 2) {
      throw new Error(`Ligne ${index + 1}: sépare la matrice et le second membre avec "|".`);
    }

    const leftTokens = parts[0].trim().split(/[\s,;]+/).filter(Boolean);
    const rightTokens = parts[1].trim().split(/[\s,;]+/).filter(Boolean);

    if (leftTokens.length === 0) {
      throw new Error(`Ligne ${index + 1}: il manque les coefficients.`);
    }

    if (rightTokens.length !== 1) {
      throw new Error(`Ligne ${index + 1}: il faut un seul second membre après "|".`);
    }

    return [
      ...leftTokens.map((token) => parseFraction(token)),
      parseFraction(rightTokens[0]),
    ];
  });

  const width = augmentedMatrix[0].length;

  augmentedMatrix.forEach((row, index) => {
    if (row.length !== width) {
      throw new Error(`Ligne ${index + 1}: toutes les lignes doivent avoir la même longueur.`);
    }
  });

  const variableCount = width - 1;

  if (variableCount <= 0) {
    throw new Error("La matrice augmentée doit contenir au moins une inconnue.");
  }

  const variableNames = Array.from({ length: variableCount }, (_, index) => `x${index + 1}`);
  return { variableNames, augmentedMatrix };
}

export function parseSquareMatrixInput(rawText) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Entre au moins une ligne de matrice.");
  }

  const matrix = lines.map((line, index) => {
    const tokens = line.split(/[\s,;]+/).filter(Boolean);

    if (tokens.length === 0) {
      throw new Error(`Ligne ${index + 1}: il manque les coefficients.`);
    }

    return tokens.map((token) => parseFraction(token));
  });

  const size = matrix.length;

  matrix.forEach((row, index) => {
    if (row.length !== size) {
      throw new Error(`Ligne ${index + 1}: la matrice doit être carrée.`);
    }
  });

  return { matrix };
}

function swapRows(matrix, firstRow, secondRow) {
  const copy = cloneMatrix(matrix);
  [copy[firstRow], copy[secondRow]] = [copy[secondRow], copy[firstRow]];
  return copy;
}

function scaleRow(matrix, rowIndex, factor) {
  const copy = cloneMatrix(matrix);
  copy[rowIndex] = copy[rowIndex].map((value) => value.mul(factor));
  return copy;
}

function combineRows(matrix, targetRow, sourceRow, factor) {
  const copy = cloneMatrix(matrix);
  copy[targetRow] = copy[targetRow].map((value, index) =>
    value.sub(copy[sourceRow][index].mul(factor)),
  );
  return copy;
}

function identityMatrix(size) {
  return Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, columnIndex) =>
      rowIndex === columnIndex ? Fraction.one() : Fraction.zero(),
    ),
  );
}

function concatenateMatrices(left, right) {
  return left.map((row, index) => [...row, ...right[index]]);
}

function extractSubMatrix(matrix, startColumn, endColumn) {
  return matrix.map((row) => row.slice(startColumn, endColumn));
}

function isIdentityMatrix(matrix) {
  return matrix.every((row, rowIndex) =>
    row.every((value, columnIndex) =>
      rowIndex === columnIndex ? value.equals(Fraction.one()) : value.isZero(),
    ),
  );
}

function firstNonZeroIndex(row, stopBefore) {
  for (let index = 0; index < stopBefore; index += 1) {
    if (!row[index].isZero()) {
      return index;
    }
  }

  return -1;
}

function getPivotColumns(matrix, variableCount) {
  const pivotColumns = [];

  matrix.forEach((row) => {
    const pivot = firstNonZeroIndex(row, variableCount);
    if (pivot !== -1) {
      pivotColumns.push(pivot);
    }
  });

  return pivotColumns;
}

function analyzeSolution(matrix, variableNames) {
  const variableCount = variableNames.length;
  const pivotColumns = [];
  let inconsistent = false;

  matrix.forEach((row) => {
    const pivot = firstNonZeroIndex(row, variableCount);

    if (pivot === -1) {
      if (!row[variableCount].isZero()) {
        inconsistent = true;
      }
      return;
    }

    pivotColumns.push(pivot);
  });

  if (inconsistent) {
    return {
      type: "inconsistent",
      pivotColumns,
      freeColumns: [],
      rank: pivotColumns.length,
    };
  }

  const freeColumns = [];

  for (let index = 0; index < variableCount; index += 1) {
    if (!pivotColumns.includes(index)) {
      freeColumns.push(index);
    }
  }

  return {
    type: freeColumns.length === 0 ? "unique" : "infinite",
    pivotColumns,
    freeColumns,
    rank: pivotColumns.length,
  };
}

function variableToLatex(name) {
  const match = name.match(/^([a-zA-Z]+)(\d+)$/);

  if (!match) {
    return name;
  }

  return `${match[1]}_{${match[2]}}`;
}

function formatSignedTerm(coefficient, variableLatex, isFirst) {
  const negative = coefficient.numerator < 0n;
  const absolute = coefficient.abs();
  const coefficientLatex = absolute.equals(Fraction.one())
    ? ""
    : absolute.toLatex();
  const sign = negative ? (isFirst ? "-" : " - ") : isFirst ? "" : " + ";
  return `${sign}${coefficientLatex}${variableLatex}`;
}

function equationCellsLatex(row, variableNames) {
  const cells = [];
  let firstDisplayed = false;

  row.slice(0, variableNames.length).forEach((coefficient, index) => {
    const variable = variableToLatex(variableNames[index]);
    const isZero = coefficient.isZero();
    const absolute = coefficient.abs();
    const term = absolute.equals(Fraction.one())
      ? variable
      : `${absolute.toLatex()}${variable}`;
    const signedTerm = coefficient.numerator < 0n ? `-${term}` : term;

    if (index === 0) {
      cells.push(isZero ? "" : signedTerm);
      firstDisplayed = !isZero;
      return;
    }

    if (!firstDisplayed) {
      cells.push("");
      cells.push(isZero ? "" : signedTerm);
      firstDisplayed = !isZero;
      return;
    }

    if (isZero) {
      cells.push("", "");
      return;
    }

    const sign = coefficient.numerator < 0n ? "-" : "+";
    cells.push(sign, term);
  });

  if (!firstDisplayed && cells.length > 0) {
    cells[0] = "0";
  }

  return cells;
}

export function matrixToLatex(matrix) {
  if (matrix.length === 0) {
    return "";
  }

  const columnCount = matrix[0].length;
  const alignment = "c".repeat(columnCount);
  const rows = matrix
    .map((row) => row.map((value) => value.toLatex()).join(" & "))
    .join(" \\\\ ");

  return `$$\\left(\\begin{array}{${alignment}}${rows}\\end{array}\\right)$$`;
}

export function augmentedMatrixToLatex(matrix, splitIndex) {
  if (matrix.length === 0) {
    return "";
  }

  const columnCount = matrix[0].length;
  const alignment = `${"c".repeat(splitIndex)}|${"c".repeat(columnCount - splitIndex)}`;
  const rows = matrix
    .map((row) => row.map((value) => value.toLatex()).join(" & "))
    .join(" \\\\ ");

  return `$$\\left(\\begin{array}{${alignment}}${rows}\\end{array}\\right)$$`;
}

export function systemToLatex(matrix, variableNames) {
  if (matrix.length === 0) {
    return "";
  }

  const alignment =
    variableNames.length <= 1
      ? "rcl"
      : `r${"cr".repeat(variableNames.length - 1)}cl`;
  const rows = matrix
    .map((row) => {
      const cells = equationCellsLatex(row, variableNames);
      return [...cells, "=", row[variableNames.length].toLatex()].join(" & ");
    })
    .join(" \\\\[0.45em] ");

  return `$$\\left\\{\\begin{array}{${alignment}}${rows}\\end{array}\\right.$$`;
}

function formatScalarLatex(value) {
  if (value.equals(Fraction.one())) {
    return "";
  }

  if (value.equals(Fraction.one().neg())) {
    return "-";
  }

  return value.toLatex();
}

function buildParametricSolution(matrix, variableNames, analysis) {
  if (analysis.type === "inconsistent") {
    return "$$\\varnothing$$";
  }

  const variableCount = variableNames.length;
  const rowByPivot = new Map();

  matrix.forEach((row, index) => {
    const pivot = firstNonZeroIndex(row, variableCount);
    if (pivot !== -1) {
      rowByPivot.set(pivot, index);
    }
  });

  const parameterNames = analysis.freeColumns.map((_, index) => `\\lambda_{${index + 1}}`);
  const pivotLines = [];
  const freeLines = [];

  analysis.freeColumns.forEach((column, index) => {
    freeLines.push([variableToLatex(variableNames[column]), parameterNames[index]]);
  });

  analysis.pivotColumns.forEach((pivotColumn) => {
    const row = matrix[rowByPivot.get(pivotColumn)];
    let expression = row[variableCount].isZero() ? "" : row[variableCount].toLatex();

    analysis.freeColumns.forEach((freeColumn, parameterIndex) => {
      const coefficient = row[freeColumn];

      if (coefficient.isZero()) {
        return;
      }

      const opposite = coefficient.neg();
      const sign = opposite.numerator < 0n
        ? expression
          ? " - "
          : "-"
        : expression
          ? " + "
          : "";
      const absolute = opposite.abs();
      const scalar = absolute.equals(Fraction.one()) ? "" : absolute.toLatex();
      expression += `${sign}${scalar}${parameterNames[parameterIndex]}`;
    });

    if (!expression) {
      expression = "0";
    }

    pivotLines.push([variableToLatex(variableNames[pivotColumn]), expression]);
  });

  const rows = [...pivotLines, ...freeLines]
    .map(([left, right]) => `${left} & = & ${right}`)
    .join(" \\\\[0.45em] ");

  return `$$\\left\\{\\begin{array}{lcl}${rows}\\end{array}\\right.$$`;
}

export function runGaussianElimination({ variableNames, augmentedMatrix }) {
  const matrix = cloneMatrix(augmentedMatrix);
  const steps = [
    {
      type: "initial",
      matrix: cloneMatrix(matrix),
    },
  ];

  let pivotRow = 0;
  const variableCount = variableNames.length;

  for (let column = 0; column < variableCount && pivotRow < matrix.length; column += 1) {
    let bestRow = -1;

    for (let row = pivotRow; row < matrix.length; row += 1) {
      if (!matrix[row][column].isZero()) {
        bestRow = row;
        break;
      }
    }

    if (bestRow === -1) {
      continue;
    }

    if (bestRow !== pivotRow) {
      const swapped = swapRows(matrix, pivotRow, bestRow);
      swapped.forEach((row, index) => {
        matrix[index] = row;
      });
      steps.push({
        type: "swap",
        row: pivotRow,
        withRow: bestRow,
        matrix: cloneMatrix(matrix),
      });
    }

    const pivot = matrix[pivotRow][column];

    if (!pivot.isOne()) {
      const scaled = scaleRow(matrix, pivotRow, Fraction.one().div(pivot));
      scaled.forEach((row, index) => {
        matrix[index] = row;
      });
      steps.push({
        type: "scale",
        row: pivotRow,
        factor: Fraction.one().div(pivot),
        matrix: cloneMatrix(matrix),
      });
    }

    for (let row = pivotRow + 1; row < matrix.length; row += 1) {
      const factor = matrix[row][column];

      if (factor.isZero()) {
        continue;
      }

      const combined = combineRows(matrix, row, pivotRow, factor);
      combined.forEach((matrixRow, index) => {
        matrix[index] = matrixRow;
      });
      steps.push({
        type: "combine",
        row,
        withRow: pivotRow,
        factor,
        matrix: cloneMatrix(matrix),
      });
    }

    pivotRow += 1;
  }

  const pivots = getPivotColumns(matrix, variableCount);

  for (let pivotIndex = pivots.length - 1; pivotIndex >= 0; pivotIndex -= 1) {
    const column = pivots[pivotIndex];
    const row = pivotIndex;

    for (let upperRow = row - 1; upperRow >= 0; upperRow -= 1) {
      const factor = matrix[upperRow][column];

      if (factor.isZero()) {
        continue;
      }

      const combined = combineRows(matrix, upperRow, row, factor);
      combined.forEach((matrixRow, index) => {
        matrix[index] = matrixRow;
      });
      steps.push({
        type: "combine",
        row: upperRow,
        withRow: row,
        factor,
        matrix: cloneMatrix(matrix),
      });
    }
  }

  const analysis = analyzeSolution(matrix, variableNames);

  return {
    variableNames,
    initialMatrix: cloneMatrix(augmentedMatrix),
    finalMatrix: cloneMatrix(matrix),
    steps,
    analysis,
    solutionLatex: buildParametricSolution(matrix, variableNames, analysis),
  };
}

export function runMatrixInversion({ matrix: rawMatrix }) {
  const baseMatrix = cloneMatrix(rawMatrix);
  const size = baseMatrix.length;
  const augmented = concatenateMatrices(baseMatrix, identityMatrix(size));
  const steps = [
    {
      type: "initial",
      matrix: cloneMatrix(augmented),
    },
  ];

  for (let column = 0; column < size; column += 1) {
    let pivotRow = -1;

    for (let row = column; row < size; row += 1) {
      if (!augmented[row][column].isZero()) {
        pivotRow = row;
        break;
      }
    }

    if (pivotRow === -1) {
      return {
        size,
        initialMatrix: cloneMatrix(baseMatrix),
        initialAugmented: concatenateMatrices(baseMatrix, identityMatrix(size)),
        finalAugmented: cloneMatrix(augmented),
        steps,
        isInvertible: false,
        inverseMatrix: null,
      };
    }

    if (pivotRow !== column) {
      const swapped = swapRows(augmented, column, pivotRow);
      swapped.forEach((row, index) => {
        augmented[index] = row;
      });
      steps.push({
        type: "swap",
        row: column,
        withRow: pivotRow,
        matrix: cloneMatrix(augmented),
      });
    }

    const pivot = augmented[column][column];

    if (!pivot.isOne()) {
      const scaled = scaleRow(augmented, column, Fraction.one().div(pivot));
      scaled.forEach((row, index) => {
        augmented[index] = row;
      });
      steps.push({
        type: "scale",
        row: column,
        factor: Fraction.one().div(pivot),
        matrix: cloneMatrix(augmented),
      });
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];

      if (factor.isZero()) {
        continue;
      }

      const combined = combineRows(augmented, row, column, factor);
      combined.forEach((matrixRow, index) => {
        augmented[index] = matrixRow;
      });
      steps.push({
        type: "combine",
        row,
        withRow: column,
        factor,
        matrix: cloneMatrix(augmented),
      });
    }
  }

  const leftMatrix = extractSubMatrix(augmented, 0, size);
  const inverseMatrix = extractSubMatrix(augmented, size, 2 * size);

  return {
    size,
    initialMatrix: cloneMatrix(baseMatrix),
    initialAugmented: concatenateMatrices(baseMatrix, identityMatrix(size)),
    finalAugmented: cloneMatrix(augmented),
    steps,
    isInvertible: isIdentityMatrix(leftMatrix),
    inverseMatrix: isIdentityMatrix(leftMatrix) ? inverseMatrix : null,
  };
}

export function analyzeGaussInput(mode, input) {
  const parsed =
    mode === "system" ? parseSystemInput(input) : parseMatrixInput(input);

  return runGaussianElimination(parsed);
}

export function analyzeInverseInput(input) {
  const parsed = parseSquareMatrixInput(input);
  return runMatrixInversion(parsed);
}

export function fractionToOperationLatex(value) {
  return formatScalarLatex(value);
}
