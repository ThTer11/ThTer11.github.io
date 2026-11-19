import { InputError } from "./inputError";
import { Fraction, matrixToLatex, parseFraction } from "./gauss";

const SOURCE_BASIS = { fr: "Base de départ", en: "Source basis" };
const TARGET_BASIS = { fr: "Base d'arrivée", en: "Target basis" };
const IMAGES = { fr: "Images", en: "Images" };
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
    throw new InputError(`${label.fr}: ligne ${index + 1} vide.`, `${label.en}: row ${index + 1} is empty.`);
  }

  return tokens.map((token) => parseFraction(token));
}

function parseVectorList(rawText, label) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new InputError(`${label.fr}: entre au moins un vecteur.`, `${label.en}: enter at least one vector.`);
  }

  const vectors = lines.map((line, index) => parseVectorLine(line, index, label));
  const dimension = vectors[0].length;

  vectors.forEach((vector, index) => {
    if (vector.length !== dimension) {
      throw new InputError(`${label.fr}: la ligne ${index + 1} n'a pas la bonne dimension.`, `${label.en}: row ${index + 1} has the wrong number of entries.`);
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

export function canonicalBasisText(dimension) {
  return identityMatrix(dimension).map((vector) => vector.map(String).join(" ")).join("\n");
}

function swapRows(matrix, first, second) {
  [matrix[first], matrix[second]] = [matrix[second], matrix[first]];
}

function invertMatrix(matrix, label) {
  const size = matrix.length;

  if (size === 0 || matrix.some((row) => row.length !== size)) {
    throw new InputError(`${label.fr}: la matrice associée doit être carrée.`, `${label.en}: the associated matrix must be square.`);
  }

  const left = cloneMatrix(matrix);
  const right = identityMatrix(size);

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;

    while (pivotRow < size && left[pivotRow][column].isZero()) {
      pivotRow += 1;
    }

    if (pivotRow === size) {
      throw new InputError(`${label.fr}: la famille donnée n'est pas une base.`, `${label.en}: the given vectors do not form a basis.`);
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
    .replace(/([a-zA-Z]+)_\{?(\d+)\}?/g, "$1$2")
    .replace(/\s+/g, "");
}

function formulaVariables(rawText) {
  return [...new Set(rawText.split("\n").map(normalizeExpression).join("+").match(/[a-zA-Z][a-zA-Z0-9]*/g) || [])];
}

export function inferLinearMapSourceDimension(formulaText, currentDimension = 1) {
  const used = formulaVariables(formulaText);
  const requiredDimension = used.length && used.every((name) => /^x\d+$/.test(name))
    ? Math.max(...used.map((name) => Number(name.slice(1))))
    : used.length;
  // A map can omit coordinates of its source space; keep explicitly chosen dimensions.
  return Math.max(currentDimension, requiredDimension);
}

function inferVariables(rawText, dimension) {
  const used = formulaVariables(rawText);
  const defaults = Array.from({ length: dimension }, (_, i) => DEFAULT_VARIABLES[i] ?? `x${i + 1}`);
  if (used.length > dimension) throw new InputError(`L’application utilise ${used.length} variables pour une base de dimension ${dimension}.`, `The map uses ${used.length} variables, but the source basis has dimension ${dimension}.`);
  if (used.length && used.every(name => /^x\d+$/.test(name))) {
    if (used.some(name => Number(name.slice(1)) < 1 || Number(name.slice(1)) > dimension)) {
      throw new InputError(`Les indices des variables doivent être compris entre 1 et ${dimension}.`, `Variable indices must be between 1 and ${dimension}.`);
    }
    return Array.from({ length: dimension }, (_, i) => `x${i + 1}`);
  }
  if (used.every(name => defaults.includes(name))) return defaults;
  const names = used.sort((a, b) => {
    const ai = DEFAULT_VARIABLES.indexOf(a), bi = DEFAULT_VARIABLES.indexOf(b);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || a.localeCompare(b, undefined, { numeric: true });
  });
  for (let i = 0; names.length < dimension; i++) {
    const candidate = DEFAULT_VARIABLES[i] ?? `x${i + 1}`;
    if (!names.includes(candidate)) names.push(candidate);
  }
  return names;
}

function variableLatex(name) {
  return name.replace(/^([a-zA-Z]+)(\d+)$/, "$1_{$2}");
}

function parseLinearComponent(rawExpression, variableNames, label) {
  const aliases = new Map(variableNames.map((name, index) => [name, index]));
  const dimension = variableNames.length;
  const expression = normalizeExpression(rawExpression);

  if (!expression) {
    throw new InputError(`${label.fr}: composante vide.`, `${label.en}: empty component.`);
  }

  const normalized = /^[+-]/.test(expression) ? expression : `+${expression}`;
  const terms = normalized.match(/[+-][^+-]+/g) || [];
  if (terms.join("") !== normalized) throw new InputError(`${label.fr}: syntaxe invalide.`, `${label.en}: invalid syntax.`);
  const coefficients = Array.from({ length: dimension }, () => Fraction.zero());
  let constant = Fraction.zero();

  terms.forEach((term) => {
    const sign = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);

    if (!body) {
      throw new InputError(`${label.fr}: terme invalide.`, `${label.en}: invalid term.`);
    }

    if (/[a-zA-Z]/.test(body)) {
      const match = body.match(
        /^((?:\d+(?:\.\d+)?|\d*\.\d+)(?:\/(?:\d+(?:\.\d+)?|\d*\.\d+))?)?\*?([a-zA-Z][a-zA-Z0-9]*)$/,
      );

      if (!match || body.startsWith("*")) {
        throw new InputError(`${label.fr}: terme linéaire invalide "${body}".`, `${label.en}: invalid linear term "${body}".`);
      }

      const [, coefficientText, variable] = match;
      const variableIndex = aliases.get(variable);

      if (variableIndex === undefined) {
        throw new InputError(`${label.fr}: variable "${variable}" non reconnue.`, `${label.en}: unknown variable "${variable}".`);
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
    throw new InputError(`${label.fr}: l'application doit être linéaire, sans terme constant.`, `${label.en}: the map must be linear, with no constant term.`);
  }

  return coefficients;
}

function parseLinearFormula(rawText, dimension) {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new InputError("Application linéaire: entre au moins une composante.", "Linear map: enter at least one component.");
  }

  const variableNames = inferVariables(rawText, dimension);
  return { variableNames, rows: lines.map((line, index) =>
    parseLinearComponent(line, variableNames, { fr: `Application linéaire, ligne ${index + 1}`, en: `Linear map, line ${index + 1}` })) };
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

function formulaRowLatex(coefficients, variableNames) {
  const parts = [];

  coefficients.forEach((coefficient, index) => {
    const variable = variableLatex(variableNames[index]);
    const part = formatFormulaTerm(coefficient, variable, parts.length === 0);

    if (part) {
      parts.push(part);
    }
  });

  return parts.length > 0 ? parts.join("") : "0";
}

function formulaLatex(formulaRows, variableNames) {
  const variables = variableNames.map(variableLatex).join(",");
  const components = formulaRows.map((row) => formulaRowLatex(row, variableNames)).join(",\\;");
  return `$$\\begin{array}{ccccc}f & : & \\mathbb{R}^{${variableNames.length}} & \\rightarrow & \\mathbb{R}^{${formulaRows.length}} \\\\ & & \\left(${variables}\\right) & \\mapsto & \\left(${components}\\right)\\end{array}$$`;
}

function imageDefinitionLatex(sourceLabels, columns) {
  const lines = columns
    .map((column, index) => `f(${sourceLabels[index]}) = ${unwrapDisplayMath(column.imageLatex)}`)
    .join(" \\\\[0.5em] ");

  return `$$\\left\\{\\begin{array}{l}${lines}\\end{array}\\right.$$`;
}

export function canUseSameBasis({ sourceBasisText, targetBasisText, imageText, inputMode, formulaText }) {
  try {
    const sourceVectors = parseVectorList(sourceBasisText, SOURCE_BASIS);
    const sourceDimension = sourceVectors[0].length;

    if (inputMode === "formula") {
      const formulaRows = parseLinearFormula(formulaText, sourceDimension);
      return formulaRows.rows.length === sourceDimension;
    }

    const targetVectors = parseVectorList(targetBasisText, TARGET_BASIS);
    const images = parseVectorList(imageText, IMAGES);
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
  const sourceVectors = parseVectorList(sourceBasisText, SOURCE_BASIS);
  const sourceDimension = sourceVectors[0].length;

  if (sourceVectors.length !== sourceDimension) {
    throw new InputError("La base de départ doit contenir autant de vecteurs que la dimension.", "The source basis must contain as many vectors as the dimension of the domain.");
  }

  let targetVectors;
  let images;
  let formulaLatexValue = "";
  let variableNames = [];

  if (inputMode === "formula") {
    const parsed = parseLinearFormula(formulaText, sourceDimension);
    const formulaRows = parsed.rows;
    variableNames = parsed.variableNames;
    const targetDimension = formulaRows.length;

    if (sameBasis && targetDimension !== sourceDimension) {
      throw new InputError("L'option même base n'est possible que pour un endomorphisme.", "You can only use the same basis for an endomorphism.");
    }

    targetVectors = sameBasis
      ? sourceVectors.map((vector) => vector.map((value) => Fraction.from(value)))
      : parseVectorList(targetBasisText, TARGET_BASIS);
    images = computeImagesFromFormula(formulaRows, sourceVectors);
    formulaLatexValue = formulaLatex(formulaRows, variableNames);

    if (targetVectors.length !== targetDimension || targetVectors[0].length !== targetDimension) {
      throw new InputError("La base d'arrivée doit avoir la même dimension que l'espace d'arrivée.", "The target basis must match the dimension of the codomain.");
    }
  } else {
    targetVectors = sameBasis
      ? sourceVectors.map((vector) => vector.map((value) => Fraction.from(value)))
      : parseVectorList(targetBasisText, TARGET_BASIS);
    images = parseVectorList(imageText, IMAGES);

    if (sameBasis && images[0].length !== sourceDimension) {
      throw new InputError("L'option même base n'est possible que pour un endomorphisme.", "You can only use the same basis for an endomorphism.");
    }
  }

  if (images.length !== sourceVectors.length) {
    throw new InputError("Il faut donner une image pour chaque vecteur de la base de départ.", "Enter one image for each vector in the source basis.");
  }

  const targetDimension = targetVectors[0].length;

  images.forEach((vector, index) => {
    if (vector.length !== targetDimension) {
      throw new InputError(`Image ${index + 1}: la dimension ne correspond pas à l'espace d'arrivée.`, `Image ${index + 1}: the dimension does not match the codomain.`);
    }
  });

  const sourceMatrix = basisMatrixFromVectors(sourceVectors);
  const targetMatrix = basisMatrixFromVectors(targetVectors);

  invertMatrix(sourceMatrix, SOURCE_BASIS);
  const targetInverse = invertMatrix(targetMatrix, TARGET_BASIS);

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
    variableNames,
    variablesLatex: variableNames.map(variableLatex).join(",\\;"),
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
