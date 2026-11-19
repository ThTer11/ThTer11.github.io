import { InputError } from "../../utils/inputError";
import { parseCalculusExpression } from "./calculus";
import { inverse2, matrixVectorProduct } from "./linearAlgebra";
import { asFraction, Fraction } from "./rational";
import { signedTermLatex } from "./spectral";

const ONE = Fraction.one();
const ZERO = Fraction.zero();

function unsupportedExpression() {
  return new InputError(
    "Saisir une expression avec des nombres et des puissances de la forme $a^n$ ou $(-a)^n$.",
    "Enter an expression with numbers and powers of the form $a^n$ or $(-a)^n$.",
  );
}

// A term with key b represents its rational coefficient times b^n.
function addTerm(terms, base, coefficient) {
  const key = String(base);
  const sum = (terms.get(key) ?? ZERO).add(coefficient);
  if (sum.isZero()) terms.delete(key);
  else terms.set(key, sum);
  if (terms.size > 64) throw unsupportedExpression();
}

function monomial(base, coefficient) {
  const terms = new Map();
  addTerm(terms, base, coefficient);
  return terms;
}

function multiply(left, right) {
  const terms = new Map();
  for (const [leftBase, leftCoefficient] of left) {
    for (const [rightBase, rightCoefficient] of right) {
      addTerm(terms, asFraction(leftBase).mul(asFraction(rightBase)), leftCoefficient.mul(rightCoefficient));
    }
  }
  return terms;
}

function rationalPower(base, exponent) {
  if (exponent < -32n || exponent > 32n || (base.isZero() && exponent <= 0n)) {
    throw unsupportedExpression();
  }
  // Limit the size of intermediate coefficients from nested powers.
  if (String(base).length > 48) throw unsupportedExpression();
  const power = exponent < 0n ? -exponent : exponent;
  const powered = new Fraction(base.numerator ** power, base.denominator ** power);
  return exponent < 0n ? ONE.div(powered) : powered;
}

function affineExponent(node) {
  if (node.type === "number") return [ZERO, asFraction(node.raw)];
  if (node.type === "symbol" && node.name === "n") return [ONE, ZERO];
  if (node.type === "unary") {
    const terms = affineExponent(node.value);
    return node.operator === "-" ? terms.map((term) => term.neg()) : terms;
  }
  if (node.type === "binary") {
    const left = affineExponent(node.left);
    const right = affineExponent(node.right);
    if (node.operator === "+") return left.map((term, i) => term.add(right[i]));
    if (node.operator === "-") return left.map((term, i) => term.sub(right[i]));
    if (node.operator === "*") {
      if (right[0].isZero()) return left.map((term) => term.mul(right[1]));
      if (left[0].isZero()) return right.map((term) => term.mul(left[1]));
    }
    if (node.operator === "/" && right[0].isZero()) return left.map((term) => term.div(right[1]));
  }
  throw unsupportedExpression();
}

function power(left, exponent) {
  const [slope, offset] = affineExponent(exponent);
  if (slope.denominator !== 1n || offset.denominator !== 1n) throw unsupportedExpression();
  if (!slope.isZero()) {
    if (left.size !== 1 || !left.has("1")) throw unsupportedExpression();
    const base = left.get("1");
    return monomial(rationalPower(base, slope.numerator), rationalPower(base, offset.numerator));
  }
  if (!left.size) return monomial(ONE, rationalPower(ZERO, offset.numerator));
  if (left.size === 1) {
    const [[base, coefficient]] = left;
    return monomial(rationalPower(asFraction(base), offset.numerator), rationalPower(coefficient, offset.numerator));
  }
  if (offset.numerator <= 0n || offset.numerator > 4n) throw unsupportedExpression();
  let result = left;
  for (let i = 1n; i < offset.numerator; i += 1n) result = multiply(result, left);
  return result;
}

function collectTerms(node) {
  if (node.type === "number") return monomial(ONE, asFraction(node.raw));
  if (node.type === "unary") {
    const terms = collectTerms(node.value);
    return node.operator === "-" ? multiply(monomial(ONE, ONE.neg()), terms) : terms;
  }
  if (node.type !== "binary") throw unsupportedExpression();
  const left = collectTerms(node.left);
  if (node.operator === "^") return power(left, node.right);
  const right = collectTerms(node.right);
  if (node.operator === "*") return multiply(left, right);
  if (node.operator === "/") {
    if (right.size !== 1) throw unsupportedExpression();
    const [[base, coefficient]] = right;
    return multiply(left, monomial(ONE.div(asFraction(base)), ONE.div(coefficient)));
  }
  for (const [base, coefficient] of right) {
    addTerm(left, base, node.operator === "-" ? coefficient.neg() : coefficient);
  }
  return left;
}

function powerLatex(base) {
  return `${base.numerator < 0n ? `(${base.toLatex()})` : base.toLatex()}^n`;
}

export function powerTermsToLatex(terms) {
  const sum = new Map();
  terms.forEach(([base, coefficient]) => addTerm(sum, base, coefficient));
  return [...sum].map(([base, coefficient]) => {
    if (base === "1") return signedTermLatex(coefficient);
    const number = asFraction(base);
    const separator = coefficient.abs().isOne() ? "" : "\\times ";
    return signedTermLatex(coefficient, separator + powerLatex(number));
  })
    .join("").replace(/^\+/, "") || "0";
}

export function matrixPowerTerms(p, eigenvalues) {
  const inverse = inverse2(p);
  const bases = eigenvalues.map(asFraction);
  const entries = p.map((row) => inverse[0].map((_, j) =>
    row.map((coefficient, k) => [bases[k], coefficient.mul(inverse[k][j])])));
  return {
    entries,
    diagonalLatex: bases.map((base, i) => bases.map((_, j) => i === j ? powerLatex(base) : "0")),
    productLatex: p.map((row) => row.map((entry, j) => powerTermsToLatex([[bases[j], entry]]))),
    resultLatex: entries.map((row) => row.map(powerTermsToLatex)),
  };
}

export function matrixPowerVectorTerms(p, eigenvalues, initial) {
  const coordinates = matrixVectorProduct(inverse2(p), initial);
  const bases = eigenvalues.map(asFraction);
  return p.map((row) => row.map((entry, j) => [bases[j], entry.mul(coordinates[j])]));
}

export function matchesPowerExpression(raw, terms) {
  if (String(raw).includes("=")) throw unsupportedExpression();
  const actual = collectTerms(parseCalculusExpression(raw, { additionalSymbols: ["n"] }));
  const expected = new Map();
  terms.forEach(([base, coefficient]) => addTerm(expected, base, coefficient));
  return actual.size === expected.size
    && [...expected].every(([base, coefficient]) => coefficient.equals(actual.get(base) ?? ZERO));
}

export function matchesMatrixPower(input, entries) {
  return entries.flatMap((row, i) => row.map((terms, j) => matchesPowerExpression(input[i][j], terms))).every(Boolean);
}
