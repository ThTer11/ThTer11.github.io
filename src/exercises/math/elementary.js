import { normalizeExpressionInput } from "./polynomial";

function absoluteInteger(value) {
  return Math.abs(Number(value));
}

export function greatestCommonDivisor(left, right) {
  let a = absoluteInteger(left);
  let b = absoluteInteger(right);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}

export function areCoprime(left, right) {
  return greatestCommonDivisor(left, right) === 1;
}

export function simplifySquareRoot(value) {
  const radicand = Number(value);

  if (!Number.isSafeInteger(radicand) || radicand < 0) {
    throw new Error("Le radicand doit être un entier positif ou nul.");
  }

  if (radicand === 0) {
    return { coefficient: 0, radicand: 1 };
  }

  let coefficient = 1;
  let remaining = radicand;

  for (let factor = 2; factor * factor <= remaining; factor += 1) {
    while (remaining % (factor * factor) === 0) {
      coefficient *= factor;
      remaining /= factor * factor;
    }
  }

  return { coefficient, radicand: remaining };
}

export function squareRootToText(value) {
  const { coefficient, radicand } = typeof value === "number"
    ? simplifySquareRoot(value)
    : value;

  if (coefficient === 0) {
    return "0";
  }

  if (radicand === 1) {
    return String(coefficient);
  }

  if (coefficient === 1) {
    return `sqrt(${radicand})`;
  }

  if (coefficient === -1) {
    return `-sqrt(${radicand})`;
  }

  return `${coefficient}sqrt(${radicand})`;
}

export function squareRootToLatex(value) {
  const { coefficient, radicand } = typeof value === "number"
    ? simplifySquareRoot(value)
    : value;

  if (coefficient === 0) {
    return "0";
  }

  if (radicand === 1) {
    return String(coefficient);
  }

  if (coefficient === 1) {
    return `\\sqrt{${radicand}}`;
  }

  if (coefficient === -1) {
    return `-\\sqrt{${radicand}}`;
  }

  return `${coefficient}\\sqrt{${radicand}}`;
}

function normalizeSquareRootInput(rawValue) {
  return String(rawValue ?? "")
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\(?:cdot|times)/g, "*")
    .replace(/[×·∙]/g, "*")
    .replace(/\\sqrt\{(\d+)\}/g, "sqrt($1)")
    .replace(/√\s*\(?\s*(\d+)\s*\)?/g, "sqrt($1)")
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .toLowerCase();
}

function parseSquareRootTerm(rawValue) {
  const normalized = normalizeSquareRootInput(rawValue);

  if (/^[+-]?\d+$/.test(normalized)) {
    return {
      coefficient: Number(normalized),
      radicand: 1,
      hasRadical: false,
    };
  }

  const match = normalized.match(/^([+-]?\d*)sqrt\((\d+)\)$/);

  if (!match) {
    throw new Error("Écris la réponse sous la forme a√b (par exemple 3√2). ");
  }

  const coefficient = match[1] === "" || match[1] === "+"
    ? 1
    : match[1] === "-"
      ? -1
      : Number(match[1]);
  const radicand = Number(match[2]);

  if (!Number.isSafeInteger(coefficient) || !Number.isSafeInteger(radicand) || radicand < 0) {
    throw new Error("Racine carrée invalide.");
  }

  return { coefficient, radicand, hasRadical: true };
}

function canonicalSquareRoot(term) {
  const simplified = simplifySquareRoot(term.radicand);
  return {
    coefficient: term.coefficient * simplified.coefficient,
    radicand: simplified.radicand,
  };
}

export function inspectSquareRootAnswer(rawValue, expected) {
  const actualTerm = parseSquareRootTerm(rawValue);
  const expectedTerm = parseSquareRootTerm(expected);
  const actual = canonicalSquareRoot(actualTerm);
  const target = canonicalSquareRoot(expectedTerm);
  const equivalent = actual.coefficient === target.coefficient &&
    actual.radicand === target.radicand;
  const extracted = simplifySquareRoot(actualTerm.radicand);
  const formOk = extracted.coefficient === 1 &&
    !(actualTerm.hasRadical && actualTerm.radicand === 1);

  return { equivalent, formOk, actual, target };
}

function stripOuterParentheses(value) {
  let text = value;
  let changed = true;

  while (changed && text.startsWith("(") && text.endsWith(")")) {
    changed = false;
    let depth = 0;

    for (let index = 0; index < text.length; index += 1) {
      depth += text[index] === "(" ? 1 : text[index] === ")" ? -1 : 0;
      if (depth === 0 && index < text.length - 1) {
        return text;
      }
    }

    if (depth === 0) {
      text = text.slice(1, -1);
      changed = true;
    }
  }

  return text;
}

function normalizePowerInput(rawValue) {
  let text = String(rawValue ?? "")
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\(?:cdot|times)/g, "*")
    .replace(/[×·∙]/g, "*")
    .replace(/−/g, "-")
    .replace(/\s+/g, "")
    .toLowerCase();

  const latexReciprocal = text.match(/^\\(?:dfrac|tfrac|frac)\{1\}\{(.+)\}$/);
  if (latexReciprocal) {
    text = `1/(${latexReciprocal[1]})`;
  }

  text = text
    .replace(/\^\{([^{}]+)\}/g, "^($1)")
    .replace(/[{}]/g, (character) => character === "{" ? "(" : ")");

  return text;
}

function parseLinearExponent(rawValue) {
  const text = stripOuterParentheses(rawValue);

  if (!text) {
    throw new Error("Exposant manquant.");
  }

  const normalized = /^[+-]/.test(text) ? text : `+${text}`;
  const terms = normalized.match(/[+-][^+-]+/g) ?? [];
  let variable = null;
  let variableCoefficient = 0;
  let constant = 0;

  for (const term of terms) {
    const sign = term[0] === "-" ? -1 : 1;
    const body = term.slice(1);
    const variableMatch = body.match(/^(\d*)\*?([a-z][a-z0-9_]*)$/);

    if (variableMatch) {
      if (variable && variable !== variableMatch[2]) {
        throw new Error("Une seule variable est attendue dans l’exposant.");
      }
      variable = variableMatch[2];
      variableCoefficient += sign * Number(variableMatch[1] || 1);
      continue;
    }

    if (!/^\d+$/.test(body)) {
      throw new Error("Exposant non reconnu.");
    }

    constant += sign * Number(body);
  }

  return { variable, variableCoefficient, constant };
}

function negateExponent(exponent) {
  return {
    variable: exponent.variable,
    variableCoefficient: -exponent.variableCoefficient,
    constant: -exponent.constant,
  };
}

function parseSinglePower(rawValue) {
  let text = normalizePowerInput(rawValue);
  let reciprocal = false;

  const reciprocalPower = text.match(/^\(1\/([a-z0-9]+)\)\^(.+)$/);
  if (reciprocalPower) {
    const exponent = parseLinearExponent(reciprocalPower[2]);
    return {
      base: reciprocalPower[1],
      exponent: negateExponent(exponent),
      reciprocal: true,
      negativeExponent: false,
    };
  }

  if (text.startsWith("1/")) {
    reciprocal = true;
    text = stripOuterParentheses(text.slice(2));
  }

  const match = text.match(/^([a-z][a-z0-9_]*|\d+)\^(.+)$/);
  if (!match) {
    throw new Error("Écris une seule puissance, par exemple 3^(n+2).");
  }

  let exponent = parseLinearExponent(match[2]);
  const negativeExponent = exponent.constant < 0 || exponent.variableCoefficient < 0;

  if (reciprocal) {
    exponent = negateExponent(exponent);
  }

  return {
    base: match[1],
    exponent,
    reciprocal,
    negativeExponent,
  };
}

function sameExponent(left, right) {
  return left.variable === right.variable &&
    left.variableCoefficient === right.variableCoefficient &&
    left.constant === right.constant;
}

export function inspectPowerAnswer(rawValue, expected) {
  const actual = parseSinglePower(rawValue);
  const target = typeof expected === "string" ? parseSinglePower(expected) : expected;
  const equivalent = actual.base === String(target.base).toLowerCase() &&
    sameExponent(actual.exponent, target.exponent);
  const targetIsNegative = target.exponent.constant < 0 ||
    target.exponent.variableCoefficient < 0;
  const formOk = targetIsNegative
    ? actual.reciprocal && !actual.negativeExponent
    : !actual.reciprocal && !actual.negativeExponent;

  return { equivalent, formOk, actual, target };
}

export function hasExplicitFactorizedForm(rawValue) {
  const value = normalizeExpressionInput(rawValue);
  const groupedFactors = value.match(/\([^()]+\)/g) ?? [];
  const squaredGroup = /\([^()]+\)\^\(?2\)?/.test(value);
  const productWithGroup = /(?:\d|[a-z]|\))\*?\([^()]+\)/.test(value);

  return groupedFactors.length >= 2 || squaredGroup || productWithGroup;
}
