import { matrixToLatex } from "../../utils/gauss";
import {
  arePolynomialExpressionsEquivalent,
  hasDevelopedForm,
  hasFactorizedForm,
  parsePolynomialExpression,
} from "../math/polynomial";
import { asFraction, Fraction, inspectFractionInput, parseExactNumber } from "../math/rational";

const MESSAGES = {
  fr: {
    correct: "Bonne réponse.",
    incorrect: "Ce n'est pas la réponse attendue.",
    invalid: "Cette réponse n'a pas pu être interprétée.",
    reduced: "La valeur est correcte, mais la fraction doit être irréductible.",
    fraction: "La valeur est correcte, mais une fraction exacte est demandée.",
    factorized: "L'expression est la même, mais elle doit être factorisée.",
    developed: "L'expression est la même, mais elle doit être développée.",
    dimensions: "Les dimensions de la réponse ne conviennent pas.",
  },
  en: {
    correct: "Correct answer.",
    incorrect: "This is not the expected answer.",
    invalid: "This answer could not be interpreted.",
    reduced: "The value is correct, but the fraction must be reduced.",
    fraction: "The value is correct, but an exact fraction is required.",
    factorized: "The expression is the same, but it must be factorised.",
    developed: "The expression is the same, but it must be expanded.",
    dimensions: "The answer has the wrong dimensions.",
  },
};

function result(status, message, details = {}) {
  return {
    correct: status === "correct",
    status,
    message,
    ...details,
  };
}

function labels(lang) {
  return MESSAGES[lang] ?? MESSAGES.fr;
}

function normalizeCustomResult(value, lang) {
  if (typeof value === "boolean") {
    return result(value ? "correct" : "incorrect", value ? labels(lang).correct : labels(lang).incorrect);
  }

  if (!value || typeof value !== "object") {
    return result("invalid", labels(lang).invalid);
  }

  const status = value.status ?? (value.correct ? "correct" : "incorrect");
  return result(status, value.message ?? labels(lang)[status] ?? labels(lang).incorrect, value);
}

function validateExact(rawValue, expected, spec, lang) {
  const actual = parseExactNumber(rawValue);
  const target = asFraction(expected);

  if (!actual.equals(target)) {
    return result("incorrect", labels(lang).incorrect);
  }

  if (spec.type === "integer" && actual.denominator !== 1n) {
    return result("incorrect", labels(lang).incorrect);
  }

  if (spec.type === "fraction") {
    const format = inspectFractionInput(rawValue);

    if (spec.allowDecimal === false && !format.isFraction && target.denominator !== 1n) {
      return result("equivalent", labels(lang).fraction, { equivalent: true, formOk: false });
    }

    if (spec.requireReduced && format.isFraction && !format.isReduced) {
      return result("equivalent", labels(lang).reduced, { equivalent: true, formOk: false });
    }
  }

  return result("correct", labels(lang).correct, { equivalent: true, formOk: true });
}

function validateExpression(rawValue, expected, spec, lang) {
  const alternatives = Array.isArray(expected) ? expected : [expected];
  const equivalent = alternatives.some((candidate) =>
    arePolynomialExpressionsEquivalent(rawValue, candidate));

  if (!equivalent) {
    return result("incorrect", labels(lang).incorrect);
  }

  if (spec.requiredForm === "factorized" && !hasFactorizedForm(rawValue)) {
    return result("equivalent", labels(lang).factorized, { equivalent: true, formOk: false });
  }

  if (spec.requiredForm === "developed" && !hasDevelopedForm(rawValue)) {
    return result("equivalent", labels(lang).developed, { equivalent: true, formOk: false });
  }

  return result("correct", labels(lang).correct, { equivalent: true, formOk: true });
}

function normalizeText(value, spec) {
  let normalized = String(value ?? "").trim().replace(/\s+/g, " ");

  if (!spec.caseSensitive) {
    normalized = normalized.toLocaleLowerCase("fr");
  }

  if (spec.ignoreAccents) {
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  return normalized;
}

function splitSet(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  const normalized = String(rawValue ?? "")
    .trim()
    .replace(/^[{[]|[}\]]$/g, "")
    .replace(/^\s*(?:s\s*=\s*)/i, "");

  if (!normalized || ["∅", "\\varnothing", "vide"].includes(normalized.toLowerCase())) {
    return [];
  }

  return normalized.includes(";")
    ? normalized.split(";").map((item) => item.trim()).filter(Boolean)
    : normalized.split(",").map((item) => item.trim()).filter(Boolean);
}

function canonicalSetItem(value, elementType) {
  if (["integer", "number", "decimal", "fraction"].includes(elementType)) {
    return `n:${parseExactNumber(value).toString()}`;
  }

  if (elementType === "expression") {
    const polynomial = parsePolynomialExpression(value);
    return `p:${[...polynomial.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, coefficient]) => `${key}:${coefficient}`)
      .join("|")}`;
  }

  return `t:${normalizeText(value, {})}`;
}

function validateSolutionSet(rawValue, expected, spec, lang) {
  const actualValues = splitSet(rawValue);
  const expectedValues = Array.isArray(expected) ? expected : splitSet(expected);
  const elementType = spec.elementType ?? "number";
  const actual = actualValues.map((value) => canonicalSetItem(value, elementType));
  const target = expectedValues.map((value) => canonicalSetItem(value, elementType));
  const actualUnique = new Set(actual);
  const targetUnique = new Set(target);
  const same = actual.length === actualUnique.size &&
    actualUnique.size === targetUnique.size &&
    [...actualUnique].every((value) => targetUnique.has(value));

  return result(same ? "correct" : "incorrect", same ? labels(lang).correct : labels(lang).incorrect);
}

function normalizeArrayInput(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  return String(rawValue ?? "")
    .replace(/[()[\]]/g, "")
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function validateVector(rawValue, expected, spec, lang) {
  const actual = normalizeArrayInput(rawValue);
  const target = normalizeArrayInput(expected);

  if (actual.length !== target.length) {
    return result("incorrect", labels(lang).dimensions);
  }

  const itemSpec = { type: spec.elementType ?? "number" };
  const valid = actual.every((value, index) =>
    validateAnswer(value, itemSpec, target[index], {}, lang).correct);
  return result(valid ? "correct" : "incorrect", valid ? labels(lang).correct : labels(lang).incorrect);
}

function validateMatrix(rawValue, expected, spec, lang) {
  if (!Array.isArray(rawValue) || !Array.isArray(expected)) {
    return result("invalid", labels(lang).invalid);
  }

  if (rawValue.length !== expected.length || rawValue.some((row, index) =>
    !Array.isArray(row) || row.length !== expected[index].length)) {
    return result("incorrect", labels(lang).dimensions);
  }

  const itemSpec = { type: spec.elementType ?? "number" };
  const valid = rawValue.every((row, rowIndex) => row.every((value, columnIndex) =>
    validateAnswer(value, itemSpec, expected[rowIndex][columnIndex], {}, lang).correct));
  return result(valid ? "correct" : "incorrect", valid ? labels(lang).correct : labels(lang).incorrect);
}

function validateMultipleFields(rawValue, expected, spec, question, lang) {
  const fields = spec.fields ?? question.fields ?? [];
  const outcomes = fields.map((field) => validateAnswer(
    rawValue?.[field.id],
    field.answer ?? { type: field.type ?? "text" },
    expected?.[field.id],
    question,
    lang,
  ));
  const correct = outcomes.length > 0 && outcomes.every((outcome) => outcome.correct);
  return result(correct ? "correct" : "incorrect", correct ? labels(lang).correct : labels(lang).incorrect, { fields: outcomes });
}

export function validateAnswer(rawValue, spec = {}, expected, question = {}, lang = "fr") {
  try {
    if (typeof spec.validator === "function") {
      return normalizeCustomResult(
        spec.validator(rawValue, { expected, question, spec, lang }),
        lang,
      );
    }

    const type = spec.type ?? "text";

    if (["integer", "number", "decimal", "fraction"].includes(type)) {
      return validateExact(rawValue, expected, spec, lang);
    }

    if (type === "expression") {
      return validateExpression(rawValue, expected, spec, lang);
    }

    if (type === "text") {
      const alternatives = Array.isArray(expected) ? expected : [expected];
      const correct = alternatives.some((candidate) =>
        normalizeText(rawValue, spec) === normalizeText(candidate, spec));
      return result(correct ? "correct" : "incorrect", correct ? labels(lang).correct : labels(lang).incorrect);
    }

    if (type === "choice") {
      const correct = String(rawValue) === String(expected);
      return result(correct ? "correct" : "incorrect", correct ? labels(lang).correct : labels(lang).incorrect);
    }

    if (type === "boolean" || type === "true-false") {
      const normalized = typeof rawValue === "boolean"
        ? rawValue
        : ["true", "vrai", "1", "oui"].includes(String(rawValue).toLowerCase());
      const correct = normalized === Boolean(expected);
      return result(correct ? "correct" : "incorrect", correct ? labels(lang).correct : labels(lang).incorrect);
    }

    if (type === "solution-set") {
      return validateSolutionSet(rawValue, expected, spec, lang);
    }

    if (type === "vector" || type === "coordinates") {
      return validateVector(rawValue, expected, spec, lang);
    }

    if (type === "matrix") {
      return validateMatrix(rawValue, expected, spec, lang);
    }

    if (type === "multiple-fields" || type === "multi-field") {
      return validateMultipleFields(rawValue, expected, spec, question, lang);
    }

    if (type === "graphic") {
      return result("invalid", "Une interaction graphique doit fournir son propre validateur.");
    }

    return result("invalid", `Type de réponse inconnu : ${type}`);
  } catch (error) {
    return result("invalid", error.message || labels(lang).invalid);
  }
}

function toLatexValue(value) {
  if (value instanceof Fraction) {
    return value.toLatex();
  }

  return String(value);
}

export function formatExpectedAnswer(expected, spec = {}, question = {}, lang = "fr") {
  if (question.answerDisplay) {
    return question.answerDisplay;
  }

  const type = spec.type ?? "text";

  if (type === "matrix" && Array.isArray(expected)) {
    const matrix = expected.map((row) => row.map((value) => asFraction(value)));
    return matrixToLatex(matrix);
  }

  if (type === "vector" || type === "coordinates") {
    return `$$\\left(${expected.map(toLatexValue).join(",\\;")}\\right)$$`;
  }

  if (type === "solution-set") {
    const values = Array.isArray(expected) ? expected : [expected];
    return `$$\\left\\{${values.map(toLatexValue).join(",\\;")}\\right\\}$$`;
  }

  if (type === "multiple-fields" || type === "multi-field") {
    const fields = spec.fields ?? question.fields ?? [];
    return fields
      .map((field) => {
        const label = typeof field.label === "object"
          ? field.label[lang] ?? field.label.fr ?? field.id
          : field.label ?? field.id;
        return `<strong>${label}</strong> : $${toLatexValue(expected[field.id])}$`;
      })
      .join("<br />");
  }

  if (["integer", "number", "decimal", "fraction", "expression"].includes(type)) {
    return `$$${toLatexValue(expected)}$$`;
  }

  const option = (question.options ?? spec.options ?? []).find((item) => String(item.id) === String(expected));
  return option?.label ?? String(expected);
}
