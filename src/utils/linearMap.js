import { Fraction, matrixToLatex, parseFraction } from "./gauss";

const DEFAULT_VARIABLES = ["x", "y", "z", "t", "u", "v", "w"];

function cloneMatrix(matrix) {
  return matrix.map((row) => row.map((value) => Fraction.from(value)));
}

function vectorLabel(prefix, index) {
  return `${prefix}_{${index + 1}}`;
}

function parseVectorLine(line, index, label) {
  const tokens = line.trim().split(/[\s,;]+/).filter(Boolean);

  if (tokens.length === 0) {
    throw new Error(`${label}: ligne ${index + 1} vide.`);
  }

  return tokens.map((token) => parseFraction(token));
}

function parseVectorList(rawText, label) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`${label}: entre au moins un vecteur.`);
  }

  const vectors = lines.map((line, index) => parseVectorLine(line, index, label));
  const dimension = vectors[0].length;

  vectors.forEach((vector, index) => {
    if (vector.length !== dimension) {
      throw new Error(`${label}: la ligne ${index + 1} n'a pas la bonne dimension.`);
    }
  });

  return vectors;
}

function basisMatrixFromVectors(vectors) {
  const size = vectors.length;
  const dimension = vectors[0].length;

  return Array.from({ length: dimension }, (_, row) =>
    Array.from({ length: size }, (_, column) => Fraction.from(vectors[column][row])),
  );
}

function identityMatrix(size) {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) =>
      row === column ? Fraction.one() : Fraction.zero(),
    ),
  );
}

function swapRows(matrix, first, second) {
  [matrix[first], matrix[second]] = [matrix[second], matrix[first]];
}

function invertMatrix(matrix, label) {
  const size = matrix.length;

  if (size === 0 || matrix.some((row) => row.length !== size)) {
    throw new Error(`${label}: la matrice associée doit être carrée.`);
  }

  const left = cloneMatrix(matrix);
  const right = identityMatrix(size);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;

    while (pivotRow < size && left[pivotRow][column].isZero()) {
      pivotRow += 1;
    }

    if (pivotRow === size) {
      throw new Error(`${label}: la famille donnée n'est pas une base.`);
    }

    if (pivotRow !== column) {
      swapRows(left, pivotRow, column);
      swapRows(right, pivotRow, column);
    }

    const pivot = left[column][column];

    for (let cursor = 0; cursor < size; cursor += 1) {
      left[column][cursor] = left[column][cursor].div(pivot);
      right[column][cursor] = right[column][cursor].div(pivot);
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = left[row][column];

      if (factor.isZero()) {
        continue;
      }

      for (let cursor = 0; cursor < size; cursor += 1) {
        left[row][cursor] = left[row][cursor].sub(factor.mul(left[column][cursor]));
        right[row][cursor] = right[row][cursor].sub(factor.mul(right[column][cursor]));
      }
    }
  }

  return right;
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) =>
    row.reduce(
      (sum, value, index) => sum.add(value.mul(vector[index])),
      Fraction.zero(),
    ));
}

function coefficientToBasisLatex(value, label, first) {
  if (value.isZero()) {
    return "";
  }

  const sign = value.numerator < 0n ? (first ? "-" : " - ") : first ? "" : " + ";
  const absolute = value.abs();
  const scalar = absolute.isOne() ? "" : `${absolute.toLatex()} `;
  return `${sign}${scalar}${label}`;
}

function combinationLatex(coefficients, labels) {
  const parts = [];

  coefficients.forEach((value, index) => {
    const part = coefficientToBasisLatex(value, labels[index], parts.length === 0);

    if (part) {
      parts.push(part);
    }
  });

  return parts.length > 0 ? parts.join("") : "0";
}

function coefficientToVectorLatex(value, vectorLatex, first) {
  if (value.isZero()) {
    return "";
  }

  const sign = value.numerator < 0n ? (first ? "-" : " - ") : first ? "" : " + ";
  const absolute = value.abs();
  const scalar = absolute.isOne() ? "" : `${absolute.toLatex()} `;
  return `${sign}${scalar}${vectorLatex}`;
}

function vectorCombinationLatex(coefficients, vectors) {
  const parts = [];

  coefficients.forEach((value, index) => {
    const vectorLatex = columnVectorLatex(vectors[index]).replace(/^\$\$/, "").replace(/\$\$$/, "");
    const part = coefficientToVectorLatex(value, vectorLatex, parts.length === 0);

    if (part) {
      parts.push(part);
    }
  });

  return parts.length > 0 ? parts.join("") : "0";
}

function columnVectorLatex(vector) {
  return matrixToLatex(vector.map((value) => [value]));
}

function unwrapDisplayMath(rawLatex) {
  return rawLatex.replace(/^\$\$/, "").replace(/\$\$$/, "");
}

function vectorDisplayLatex(vector) {
  return unwrapDisplayMath(columnVectorLatex(vector));
}

function familyLatex(name, vectors) {
  return `$$${name}=\\left(${vectors.map((vector) => vectorDisplayLatex(vector)).join(",\\;")}\\right)$$`;
}

function normalizeExpression(text) {
  return text
    .replace(/\u2212/g, "-")
    .replace(/\*/g, "")
    .replace(/\s+/g, "");
}

function variableAliases(dimension) {
  const aliases = new Map();

  for (let index = 0; index < dimension; index += 1) {
    aliases.set(`x${index + 1}`, index);
    if (index < DEFAULT_VARIABLES.length) {
      aliases.set(DEFAULT_VARIABLES[index], index);
    }
  }

  return aliases;
}

function parseLinearComponent(rawExpression, dimension, label) {
  const aliases = variableAliases(dimension);
  const expression = normalizeExpression(rawExpression);

  if (!expression) {
    throw new Error(`${label}: composante vide.`);
  }

  const normalized = /^[+-]/.test(expression) ? expression : `+${expression}`;
  const terms = normalized.match(/[+-][^+-]+/g) || [];
  const coefficients = Array.from({ length: dimension }, () => Fraction.zero());
  let constant = Fraction.zero();

  terms.forEach((term) => {
    const sign = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);

    if (!body) {
      throw new Error(`${label}: terme invalide.`);
    }

    if (/[a-zA-Z]/.test(body)) {
      const match = body.match(
        /^((?:\d+(?:\.\d+)?|\d*\.\d+)(?:\/(?:\d+(?:\.\d+)?|\d*\.\d+))?)?([a-zA-Z][a-zA-Z0-9]*)$/,
      );

      if (!match) {
        throw new Error(`${label}: terme linéaire invalide "${body}".`);
      }

      const [, coefficientText, variable] = match;
      const variableIndex = aliases.get(variable);

      if (variableIndex === undefined) {
        throw new Error(`${label}: variable "${variable}" non reconnue.`);
      }

      const coefficient = coefficientText ? parseFraction(coefficientText) : Fraction.one();
      const signed = sign === -1 ? coefficient.neg() : coefficient;
      coefficients[variableIndex] = coefficients[variableIndex].add(signed);
      return;
    }

    const value = parseFraction(body);
    constant = constant.add(sign === -1 ? value.neg() : value);
  });

  if (!constant.isZero()) {
    throw new Error(`${label}: l'application doit être linéaire, sans terme constant.`);
  }

  return coefficients;
}

function parseLinearFormula(rawText, dimension) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("Application linéaire: entre au moins une composante.");
  }

  return lines.map((line, index) =>
    parseLinearComponent(line, dimension, `Application linéaire, ligne ${index + 1}`));
}

function computeImagesFromFormula(formulaRows, sourceVectors) {
  return sourceVectors.map((vector) =>
    formulaRows.map((component) =>
      component.reduce(
        (sum, coefficient, index) => sum.add(coefficient.mul(vector[index])),
        Fraction.zero(),
      )));
}

function formatFormulaTerm(coefficient, variable, first) {
  if (coefficient.isZero()) {
    return "";
  }

  const sign = coefficient.numerator < 0n ? (first ? "-" : " - ") : first ? "" : " + ";
  const absolute = coefficient.abs();
  const scalar = absolute.isOne() ? "" : absolute.toLatex();
  return `${sign}${scalar}${variable}`;
}

function formulaRowLatex(coefficients, dimension) {
  const parts = [];

  coefficients.forEach((coefficient, index) => {
    const variable = index < DEFAULT_VARIABLES.length ? DEFAULT_VARIABLES[index] : `x_{${index + 1}}`;
    const part = formatFormulaTerm(coefficient, variable, parts.length === 0);

    if (part) {
      parts.push(part);
    }
  });

  return parts.length > 0 ? parts.join("") : "0";
}

function formulaLatex(formulaRows) {
  const variables = DEFAULT_VARIABLES.slice(0, formulaRows[0].length).join(",");
  const components = formulaRows.map((row) => formulaRowLatex(row)).join(",\\;");
  return `$$f\\left(${variables}\\right)=\\left(${components}\\right)$$`;
}

function imageDefinitionLatex(sourceLabels, columns) {
  const lines = columns
    .map((column, index) => `f(${sourceLabels[index]}) = ${unwrapDisplayMath(column.imageLatex)}`)
    .join(" \\\\[0.5em] ");

  return `$$\\left\\{\\begin{array}{l}${lines}\\end{array}\\right.$$`;
}

export function canUseSameBasis({ sourceBasisText, targetBasisText, imageText, inputMode, formulaText }) {
  try {
    const sourceVectors = parseVectorList(sourceBasisText, "Base de départ");
    const sourceDimension = sourceVectors[0].length;

    if (inputMode === "formula") {
      const formulaRows = parseLinearFormula(formulaText, sourceDimension);
      return formulaRows.length === sourceDimension;
    }

    const targetVectors = parseVectorList(targetBasisText, "Base d'arrivée");
    const images = parseVectorList(imageText, "Images");
    return targetVectors.length === sourceDimension && targetVectors[0].length === sourceDimension && images[0].length === sourceDimension;
  } catch (_) {
    return false;
  }
}

export function analyzeLinearMapInput({
  sourceBasisText,
  targetBasisText,
  imageText,
  formulaText,
  inputMode,
  sameBasis,
}) {
  const sourceVectors = parseVectorList(sourceBasisText, "Base de départ");
  const sourceDimension = sourceVectors[0].length;

  if (sourceVectors.length !== sourceDimension) {
    throw new Error("La base de départ doit contenir autant de vecteurs que la dimension.");
  }

  let targetVectors;
  let images;
  let formulaLatexValue = "";

  if (inputMode === "formula") {
    const formulaRows = parseLinearFormula(formulaText, sourceDimension);
    const targetDimension = formulaRows.length;

    if (sameBasis && targetDimension !== sourceDimension) {
      throw new Error("L'option même base n'est possible que pour un endomorphisme.");
    }

    targetVectors = sameBasis
      ? sourceVectors.map((vector) => vector.map((value) => Fraction.from(value)))
      : parseVectorList(targetBasisText, "Base d'arrivée");
    images = computeImagesFromFormula(formulaRows, sourceVectors);
    formulaLatexValue = formulaLatex(formulaRows);

    if (targetVectors.length !== targetDimension || targetVectors[0].length !== targetDimension) {
      throw new Error("La base d'arrivée doit avoir la même dimension que l'espace d'arrivée.");
    }
  } else {
    targetVectors = sameBasis
      ? sourceVectors.map((vector) => vector.map((value) => Fraction.from(value)))
      : parseVectorList(targetBasisText, "Base d'arrivée");
    images = parseVectorList(imageText, "Images");

    if (sameBasis && images[0].length !== sourceDimension) {
      throw new Error("L'option même base n'est possible que pour un endomorphisme.");
    }
  }

  if (images.length !== sourceVectors.length) {
    throw new Error("Il faut donner une image pour chaque vecteur de la base de départ.");
  }

  const targetDimension = targetVectors[0].length;

  images.forEach((vector, index) => {
    if (vector.length !== targetDimension) {
      throw new Error(`Image ${index + 1}: la dimension ne correspond pas à l'espace d'arrivée.`);
    }
  });

  const sourceMatrix = basisMatrixFromVectors(sourceVectors);
  const targetMatrix = basisMatrixFromVectors(targetVectors);

  invertMatrix(sourceMatrix, "Base de départ");
  const targetInverse = invertMatrix(targetMatrix, "Base d'arrivée");

  const targetLabels = targetVectors.map((_, index) => vectorLabel(sameBasis ? "b" : "c", index));
  const sourceLabels = sourceVectors.map((_, index) => vectorLabel("b", index));

  const columns = images.map((image, index) => {
    const coordinates = multiplyMatrixVector(targetInverse, image);

    return {
      index,
      sourceLabel: sourceLabels[index],
      imageLatex: columnVectorLatex(image),
      vectorDecompositionLatex: vectorCombinationLatex(coordinates, targetVectors),
      decompositionLatex: combinationLatex(coordinates, targetLabels),
    };
  });

  const matrix = basisMatrixFromVectors(
    columns.map((column, index) => multiplyMatrixVector(targetInverse, images[index])),
  );
  const targetBasisName = sameBasis ? "\\mathcal{B}" : "\\mathcal{C}";

  return {
    dimension: sourceDimension,
    sameBasis,
    inputMode,
    formulaLatex: inputMode === "formula" ? formulaLatexValue : imageDefinitionLatex(sourceLabels, columns),
    sourceBasisLatex: familyLatex("\\mathcal{B}", sourceVectors),
    targetBasisLatex: familyLatex(targetBasisName, targetVectors),
    targetBasisSymbolLatex: targetBasisName,
    columns,
    matrixLatex: matrixToLatex(matrix),
    matrixTitleLatex: sameBasis
      ? "$\\mathrm{Mat}_{\\mathcal{B}}(f)$"
      : "$\\mathrm{Mat}_{\\mathcal{B},\\mathcal{C}}(f)$",
  };
}
