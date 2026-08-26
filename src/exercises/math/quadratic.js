import { Fraction } from "./rational";

function assertIntegerCoefficient(value, name) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} doit être un entier sûr.`);
  }

  return value;
}

function absBigInt(value) {
  return value < 0n ? -value : value;
}

function gcdBigInt(left, right) {
  let a = absBigInt(left);
  let b = absBigInt(right);

  while (b !== 0n) {
    [a, b] = [b, a % b];
  }

  return a === 0n ? 1n : a;
}

function integerSquareRoot(value) {
  if (value < 0n) {
    throw new RangeError("La racine carrée d'un entier négatif n'est pas réelle.");
  }

  if (value < 2n) {
    return value;
  }

  let estimate = value;
  let next = (estimate + value / estimate) / 2n;

  while (next < estimate) {
    estimate = next;
    next = (estimate + value / estimate) / 2n;
  }

  return estimate;
}

function bigintToSafeNumber(value, label) {
  const number = Number(value);

  if (!Number.isSafeInteger(number)) {
    throw new RangeError(`${label} dépasse la plage des entiers sûrs.`);
  }

  return number;
}

function compareFractions(left, right) {
  const difference = left.numerator * right.denominator -
    right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function fractionSign(value) {
  return value.numerator < 0n ? -1 : value.numerator > 0n ? 1 : 0;
}

function factorSquarePart(value) {
  let remaining = BigInt(value);
  let outside = 1n;
  let factor = 2n;

  while (factor * factor <= remaining) {
    const square = factor * factor;

    while (remaining % square === 0n) {
      remaining /= square;
      outside *= factor;
    }

    factor += 1n;
  }

  return { outside, inside: remaining };
}

function normalizeSurd(constant, radicalCoefficient, radicand, denominator) {
  let den = BigInt(denominator);
  let constantPart = BigInt(constant);
  let radicalPart = BigInt(radicalCoefficient);
  const inside = BigInt(radicand);

  if (den === 0n) {
    throw new RangeError("Le dénominateur d'une racine exacte ne peut pas être nul.");
  }

  if (den < 0n) {
    den = -den;
    constantPart = -constantPart;
    radicalPart = -radicalPart;
  }

  const divisor = gcdBigInt(gcdBigInt(constantPart, radicalPart), den);

  return {
    kind: "surd",
    constant: constantPart / divisor,
    radicalCoefficient: radicalPart / divisor,
    radicand: inside,
    denominator: den / divisor,
  };
}

function exactValueAsNumber(value) {
  if (value instanceof Fraction) {
    return Number(value.numerator) / Number(value.denominator);
  }

  return (
    Number(value.constant) +
    Number(value.radicalCoefficient) * Math.sqrt(Number(value.radicand))
  ) / Number(value.denominator);
}

function compareExactValues(left, right) {
  return exactValueAsNumber(left) - exactValueAsNumber(right);
}

function signedTerm(coefficient, body, isFirst) {
  if (coefficient === 0) {
    return "";
  }

  const negative = coefficient < 0;
  const magnitude = Math.abs(coefficient);
  const coefficientText = magnitude === 1 && body ? "" : String(magnitude);
  const sign = negative ? (isFirst ? "-" : " - ") : isFirst ? "" : " + ";
  return `${sign}${coefficientText}${body}`;
}

/** Calcule exactement le discriminant d'un trinôme à coefficients entiers sûrs. */
export function calculateDiscriminant(a, b, c) {
  assertIntegerCoefficient(a, "a");
  assertIntegerCoefficient(b, "b");
  assertIntegerCoefficient(c, "c");

  if (a === 0) {
    throw new RangeError("Le coefficient a doit être non nul pour un trinôme.");
  }

  const delta = BigInt(b) * BigInt(b) - 4n * BigInt(a) * BigInt(c);
  return bigintToSafeNumber(delta, "Le discriminant");
}

export const discriminant = calculateDiscriminant;

export function isPerfectSquare(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    return false;
  }

  const integer = BigInt(value);
  const root = integerSquareRoot(integer);
  return root * root === integer;
}

export function countRealRoots(a, b, c) {
  const delta = calculateDiscriminant(a, b, c);
  return delta < 0 ? 0 : delta === 0 ? 1 : 2;
}

export const numberOfRealRoots = countRealRoots;

/**
 * Résout ax²+bx+c=0 dans R sans nombres flottants dans le résultat.
 * Une racine rationnelle est une Fraction. Une racine irrationnelle est décrite
 * par (constant + radicalCoefficient sqrt(radicand)) / denominator.
 */
export function solveQuadraticExact(a, b, c) {
  const delta = calculateDiscriminant(a, b, c);

  if (delta < 0) {
    return {
      discriminant: delta,
      rootCount: 0,
      kind: "none",
      roots: [],
      rational: true,
    };
  }

  if (delta === 0) {
    const root = new Fraction(BigInt(-b), BigInt(2 * a));
    return {
      discriminant: delta,
      rootCount: 1,
      kind: "double",
      roots: [root],
      rational: true,
    };
  }

  if (isPerfectSquare(delta)) {
    const squareRoot = bigintToSafeNumber(integerSquareRoot(BigInt(delta)), "La racine du discriminant");
    const roots = [
      new Fraction(BigInt(-b - squareRoot), BigInt(2 * a)),
      new Fraction(BigInt(-b + squareRoot), BigInt(2 * a)),
    ].sort(compareFractions);

    return {
      discriminant: delta,
      rootCount: 2,
      kind: "two-rational",
      roots,
      rational: true,
    };
  }

  const { outside, inside } = factorSquarePart(BigInt(delta));
  const roots = [
    normalizeSurd(BigInt(-b), -outside, inside, BigInt(2 * a)),
    normalizeSurd(BigInt(-b), outside, inside, BigInt(2 * a)),
  ].sort(compareExactValues);

  return {
    discriminant: delta,
    rootCount: 2,
    kind: "two-irrational",
    roots,
    rational: false,
  };
}

export const solveQuadratic = solveQuadraticExact;

/** Transforme deux racines rationnelles en un trinôme entier primitif. */
export function quadraticFromRoots(firstRoot, secondRoot, multiplier = 1) {
  const first = Fraction.from(firstRoot);
  const second = Fraction.from(secondRoot);
  assertIntegerCoefficient(multiplier, "Le multiplicateur");

  if (multiplier === 0) {
    throw new RangeError("Le multiplicateur doit être non nul.");
  }

  const a = BigInt(multiplier) * first.denominator * second.denominator;
  const b = -BigInt(multiplier) * (
    first.numerator * second.denominator + second.numerator * first.denominator
  );
  const c = BigInt(multiplier) * first.numerator * second.numerator;

  return {
    a: bigintToSafeNumber(a, "a"),
    b: bigintToSafeNumber(b, "b"),
    c: bigintToSafeNumber(c, "c"),
  };
}

export function exactValueToLatex(value) {
  if (value instanceof Fraction) {
    return value.toLatex();
  }

  if (!value || value.kind !== "surd") {
    return String(value);
  }

  const radicalNegative = value.radicalCoefficient < 0n;
  const radicalMagnitude = absBigInt(value.radicalCoefficient);
  const radical = `${radicalMagnitude === 1n ? "" : radicalMagnitude.toString()}\\sqrt{${value.radicand}}`;
  let numerator;

  if (value.constant === 0n) {
    numerator = radicalNegative ? `-${radical}` : radical;
  } else {
    numerator = `${value.constant}${radicalNegative ? " - " : " + "}${radical}`;
  }

  return value.denominator === 1n
    ? numerator
    : `\\frac{${numerator}}{${value.denominator}}`;
}

export function formatQuadraticLatex(a, b, c, options = {}) {
  assertIntegerCoefficient(a, "a");
  assertIntegerCoefficient(b, "b");
  assertIntegerCoefficient(c, "c");

  const variable = options.variable ?? "x";
  const terms = [
    [a, `${variable}^{2}`],
    [b, variable],
    [c, ""],
  ];
  let expression = "";

  terms.forEach(([coefficient, body]) => {
    expression += signedTerm(coefficient, body, expression.length === 0);
  });

  if (!expression) {
    expression = "0";
  }

  return options.equation ? `${expression} = 0` : expression;
}

export function formatBiquadraticLatex(a, b, c, options = {}) {
  assertIntegerCoefficient(a, "a");
  assertIntegerCoefficient(b, "b");
  assertIntegerCoefficient(c, "c");

  const variable = options.variable ?? "x";
  const terms = [
    [a, `${variable}^{4}`],
    [b, `${variable}^{2}`],
    [c, ""],
  ];
  let expression = "";

  terms.forEach(([coefficient, body]) => {
    expression += signedTerm(coefficient, body, expression.length === 0);
  });

  if (!expression) {
    expression = "0";
  }

  return options.equation ? `${expression} = 0` : expression;
}

function squareRootOfFraction(value) {
  if (fractionSign(value) < 0) {
    return null;
  }

  const numeratorRoot = integerSquareRoot(value.numerator);
  const denominatorRoot = integerSquareRoot(value.denominator);

  if (
    numeratorRoot * numeratorRoot === value.numerator &&
    denominatorRoot * denominatorRoot === value.denominator
  ) {
    return new Fraction(numeratorRoot, denominatorRoot);
  }

  return {
    kind: "sqrt-fraction",
    value,
  };
}

function signedSquareRootToLatex(value, negative = false) {
  if (value instanceof Fraction) {
    return negative ? value.neg().toLatex() : value.toLatex();
  }

  const body = value.value.denominator === 1n
    ? `\\sqrt{${value.value.numerator}}`
    : `\\sqrt{${value.value.toLatex()}}`;
  return negative ? `-${body}` : body;
}

/** Résout ax⁴+bx²+c=0 dans R par la substitution y=x². */
export function solveBiquadraticExact(a, b, c) {
  const reduced = solveQuadraticExact(a, b, c);
  const roots = [];

  reduced.roots.forEach((y) => {
    if (!(y instanceof Fraction)) {
      return;
    }

    const sign = fractionSign(y);

    if (sign < 0) {
      return;
    }

    if (sign === 0) {
      roots.push(Fraction.zero());
      return;
    }

    const squareRoot = squareRootOfFraction(y);

    if (squareRoot instanceof Fraction) {
      roots.push(squareRoot.neg(), squareRoot);
    } else {
      roots.push(
        { ...squareRoot, negative: true },
        { ...squareRoot, negative: false },
      );
    }
  });

  roots.sort((left, right) => {
    const leftValue = left instanceof Fraction
      ? Number(left.numerator) / Number(left.denominator)
      : (left.negative ? -1 : 1) * Math.sqrt(
        Number(left.value.numerator) / Number(left.value.denominator),
      );
    const rightValue = right instanceof Fraction
      ? Number(right.numerator) / Number(right.denominator)
      : (right.negative ? -1 : 1) * Math.sqrt(
        Number(right.value.numerator) / Number(right.value.denominator),
      );
    return leftValue - rightValue;
  });

  return {
    substitutedEquation: reduced,
    rootCount: roots.length,
    roots,
    rootsLatex: roots.map((root) => root instanceof Fraction
      ? root.toLatex()
      : signedSquareRootToLatex(root, root.negative)),
  };
}

export const solveBiquadratic = solveBiquadraticExact;
