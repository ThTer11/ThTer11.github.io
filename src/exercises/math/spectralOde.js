import { InputError } from "../../utils/inputError";
import { calculusExpressionToLatex, parseCalculusExpression } from "./calculus";
import { inverse2, matrixVectorProduct } from "./linearAlgebra";
import { asFraction, Fraction } from "./rational";
import { signedTermLatex } from "./spectral";

const ZERO = Fraction.zero();
const ONE = Fraction.one();

const unsupported = () => new InputError(
  "Utiliser des nombres, des exponentielles en $t$ et, si nécessaire, les constantes $C_1$ et $C_2$.",
  "Use numbers, exponentials in $t$ and, if needed, the constants $C_1$ and $C_2$.",
);

function parseSystemExpression(raw) {
  if (String(raw).includes("=")) throw unsupported();
  const source = String(raw).replace(/c\s*(?:_\s*\{\s*([12])\s*\}|_?\s*([12])(?![\d_]))/gi,
    (_, braced, plain) => `c_${braced ?? plain} `)
    .replace(/c([₁₂])/gi, (_, index) => index === "₁" ? "c_1 " : "c_2 ");
  return parseCalculusExpression(source, { additionalSymbols: ["c_1", "c_2"] });
}

function affine(node) {
  if (node.type === "number") return [ZERO, asFraction(node.raw)];
  if (node.type === "symbol" && node.name === "t") return [ONE, ZERO];
  if (node.type === "unary") {
    const terms = affine(node.value);
    return node.operator === "-" ? terms.map((term) => term.neg()) : terms;
  }
  if (node.type === "binary") {
    const left = affine(node.left);
    const right = affine(node.right);
    if (node.operator === "+") return left.map((term, i) => term.add(right[i]));
    if (node.operator === "-") return left.map((term, i) => term.sub(right[i]));
    if (node.operator === "*") {
      if (right[0].isZero()) return left.map((term) => term.mul(right[1]));
      if (left[0].isZero()) return right.map((term) => term.mul(left[1]));
    }
    if (node.operator === "/" && right[0].isZero()) return left.map((term) => term.div(right[1]));
  }
  throw unsupported();
}

// A term is a rational multiple of exp(rate*t + offset), optionally times C_1 or C_2.
function addTerm(terms, term) {
  const { rate, offset, parameter, coefficient } = term;
  const key = `${rate}|${offset}|${parameter}`;
  const sum = (terms.get(key)?.coefficient ?? ZERO).add(coefficient);
  if (sum.isZero()) terms.delete(key);
  else terms.set(key, { ...term, coefficient: sum });
  if (terms.size > 64) throw unsupported();
}

function singleTerm(coefficient = ONE, rate = ZERO, offset = ZERO, parameter = "") {
  const terms = new Map();
  addTerm(terms, { rate, offset, parameter, coefficient });
  return terms;
}

function multiply(left, right) {
  const result = new Map();
  for (const a of left.values()) {
    for (const b of right.values()) {
      if (a.parameter && b.parameter) throw unsupported();
      addTerm(result, {
        rate: a.rate.add(b.rate), offset: a.offset.add(b.offset), parameter: a.parameter || b.parameter,
        coefficient: a.coefficient.mul(b.coefficient),
      });
    }
  }
  return result;
}

function collectTerms(node) {
  if (node.type === "number") return singleTerm(asFraction(node.raw));
  if (node.type === "symbol" && node.name === "e") return singleTerm(ONE, ZERO, ONE);
  if (node.type === "symbol" && ["c_1", "c_2"].includes(node.name)) return singleTerm(ONE, ZERO, ZERO, node.name);
  if (node.type === "unary") {
    const terms = collectTerms(node.value);
    return node.operator === "-" ? multiply(singleTerm(ONE.neg()), terms) : terms;
  }
  if (node.type === "call" && node.name === "exp") return singleTerm(ONE, ...affine(node.argument));
  if (node.type !== "binary") throw unsupported();
  if (node.operator === "^") {
    if (node.left.type === "symbol" && node.left.name === "e") return singleTerm(ONE, ...affine(node.right));
    throw unsupported();
  }
  const left = collectTerms(node.left);
  const right = collectTerms(node.right);
  if (node.operator === "*") return multiply(left, right);
  if (node.operator === "/") {
    const [denominator] = right.values();
    if (right.size !== 1 || denominator.parameter) throw unsupported();
    return multiply(left, singleTerm(ONE.div(denominator.coefficient), denominator.rate.neg(), denominator.offset.neg()));
  }
  for (const term of right.values()) {
    addTerm(left, node.operator === "-" ? { ...term, coefficient: term.coefficient.neg() } : term);
  }
  return left;
}

export function matchesSpectralOdeExpression(raw, expectedTerms) {
  const actual = collectTerms(parseSystemExpression(raw));
  const expected = new Map();
  expectedTerms.forEach((term) => addTerm(expected, term));
  return actual.size === expected.size && [...expected].every(([key, term]) =>
    term.coefficient.equals(actual.get(key)?.coefficient ?? ZERO));
}

export function spectralOdeExpressionToLatex(raw) {
  return calculusExpressionToLatex(parseSystemExpression(raw)).replace(/\bc_([12])/g, "C_$1");
}

export function spectralOdeModes(roots) {
  return roots.map((root) => ({ rate: asFraction(root), offset: ZERO, parameter: "", coefficient: ONE }));
}

export function spectralOdeSolution(basis, roots, initial) {
  const coordinates = initial ? matrixVectorProduct(inverse2(basis), initial) : null;
  const modes = spectralOdeModes(roots);
  return {
    coordinates,
    terms: basis.map((row) => row.map((entry, i) => ({
      ...modes[i],
      parameter: coordinates ? "" : `c_${i + 1}`,
      coefficient: coordinates ? entry.mul(coordinates[i]) : entry,
    }))),
  };
}

export function spectralOdeTermsToLatex(terms) {
  return terms.map(({ rate, parameter, coefficient }) => {
    const constant = parameter ? parameter.toUpperCase() : "";
    const exponent = signedTermLatex(rate, "t").replace(/^\+/, "");
    return signedTermLatex(coefficient, `${constant}${exponent ? `\\mathrm{e}^{${exponent}}` : ""}`);
  }).join("").replace(/^\+/, "") || "0";
}

export function differentialSystemLatex(matrix, variable) {
  const equations = matrix.map((row, index) => {
    const terms = row.map((entry, i) => signedTermLatex(entry, `${variable}_${i + 1}(t)`));
    return `${variable}_${index + 1}'(t)=${terms.join("").replace(/^\+/, "") || "0"}`;
  });
  return `$$\\begin{cases}${equations.join("\\\\")}\\end{cases}$$`;
}
