import { InputError } from "../../utils/inputError";
import { parseCalculusExpression } from "./calculus";
import { factorSquarePart } from "./quadratic";
import { asFraction, Fraction, gcdBigInt } from "./rational";

const ZERO = Fraction.zero();
const ONE = Fraction.one();
const I = new Map([[-1n, ONE]]);
const MAX_COEFFICIENT = 10n ** 160n;

function unsupported() {
  return new InputError(
    "Écrire une valeur exacte avec des fractions, des racines carrées et, si nécessaire, $i$.",
    "Enter an exact value using fractions, square roots and, if needed, $i$.",
  );
}

// Each key d is square-free. A negative key represents i times sqrt(-d).
function addTerm(terms, d, coefficient) {
  const sum = (terms.get(d) ?? ZERO).add(coefficient);
  if (sum.abs().numerator > MAX_COEFFICIENT || sum.denominator > MAX_COEFFICIENT) throw unsupported();
  if (sum.isZero()) terms.delete(d);
  else terms.set(d, sum);
  if (terms.size > 64) throw unsupported();
}

function multiply(left, right) {
  const result = new Map();
  for (const [a, x] of left) {
    for (const [b, y] of right) {
      const common = gcdBigInt(a, b);
      const radicand = (a / common) * (b / common);
      addTerm(result, radicand, x.mul(y).mul(a < 0n && b < 0n ? -common : common));
    }
  }
  return result;
}

function divide(left, right) {
  if (right.size > 2) throw unsupported();
  const conjugate = new Map([...right].map(([radicand, coefficient], index) =>
    [radicand, index === 0 ? coefficient : coefficient.neg()]));
  const inverseNorm = ONE.div(multiply(right, conjugate).get(1n) ?? ZERO);
  return new Map([...multiply(left, conjugate)].map(([radicand, coefficient]) =>
    [radicand, coefficient.mul(inverseNorm)]));
}

function squareRoot(terms) {
  const value = terms.get(1n) ?? ZERO;
  if (!terms.size) return new Map();
  const magnitude = value.abs().numerator * value.denominator;
  if (terms.size !== 1 || !terms.has(1n) || magnitude > 1000000n) throw unsupported();
  const { inside, outside } = factorSquarePart(magnitude);
  return new Map([[value.numerator < 0n ? -inside : inside, new Fraction(outside, value.denominator)]]);
}

function collectTerms(node) {
  if (node.type === "number") {
    const value = asFraction(node.raw);
    return value.isZero() ? new Map() : new Map([[1n, value]]);
  }
  if (node.type === "symbol" && node.name === "i") return I;
  if (node.type === "unary") {
    const terms = collectTerms(node.value);
    return node.operator === "-" ? new Map([...terms].map(([d, coefficient]) => [d, coefficient.neg()])) : terms;
  }
  if (node.type === "call" && node.name === "sqrt") return squareRoot(collectTerms(node.argument));
  if (node.type !== "binary") throw unsupported();
  const left = collectTerms(node.left);
  const right = collectTerms(node.right);
  if (node.operator === "*") return multiply(left, right);
  if (node.operator === "/") return divide(left, right);
  if (node.operator === "^") {
    if (right.size === 1 && right.get(1n)?.equals(2)) return multiply(left, left);
    if (right.size === 1 && right.get(1n)?.equals("1/2")) return squareRoot(left);
    throw unsupported();
  }
  const result = new Map(left);
  for (const [d, coefficient] of right) addTerm(result, d, node.operator === "-" ? coefficient.neg() : coefficient);
  return result;
}

export function parseQuadraticRoot(raw) {
  if (String(raw).includes("=")) throw new InputError("Saisir seulement la valeur de la racine.", "Enter only the value of the root.");
  return collectTerms(parseCalculusExpression(raw, { additionalSymbols: ["i"] }));
}

export function equalQuadraticRoots(left, right) {
  return left.size === right.size && [...left].every(([d, coefficient]) => coefficient.equals(right.get(d) ?? ZERO));
}
