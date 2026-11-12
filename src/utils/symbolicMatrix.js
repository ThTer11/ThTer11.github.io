import nerdamer from "nerdamer";
import "nerdamer/Algebra";
import { runMatrixInversion } from "./gauss";

const FUNCTIONS = new Set(["sqrt", "sin", "cos", "exp", "log", "abs"]);
const RATIONAL = /^-?\d+(?:\/\d+)?$/;
const cache = new Map();

function closingParen(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Invalid expression");
}

function realValue(text) {
  try {
    const expression = nerdamer(text);
    if (expression.variables().length) return null;
    const value = Number(expression.evaluate().text("decimals"));
    return Number.isNaN(value) ? null : value;
  } catch (_) { return null; }
}

// Treat elementary functions as exact algebraic atoms during rational simplification.
// This prevents numerical evaluation of ln(2), exp(2), etc., and avoids expanding
// simple trigonometric expressions into less readable double-angle formulas.
function simplifyExactly(text) {
  if (cache.has(text)) return cache.get(text);
  const original = nerdamer(text);
  let protectedText = original.toString();
  const atoms = [], byValue = new Map(), trig = new Map();
  const protect = value => {
    if (byValue.has(value)) return byValue.get(value);
    let name = `matrixExactAtom${atoms.length}`;
    while (protectedText.includes(name)) name += "q";
    atoms.push([name, value]);
    byValue.set(value, name);
    const match = value.match(/^(sin|cos)\((.*)\)$/);
    if (match) {
      const pair = trig.get(match[2]) || {};
      pair[match[1]] = name;
      trig.set(match[2], pair);
    }
    return name;
  };
  const pattern = /[a-zA-Z][a-zA-Z0-9_]*\(/g;
  let match;
  while ((match = pattern.exec(protectedText))) {
    const end = closingParen(protectedText, pattern.lastIndex - 1);
    const replacement = protect(protectedText.slice(match.index, end + 1));
    protectedText = protectedText.slice(0, match.index) + replacement + protectedText.slice(end + 1);
    pattern.lastIndex = match.index + replacement.length;
  }
  // Nonconstant exponentials are also indivisible atoms in polynomial operations.
  const powers = /\be\^/g;
  while ((match = powers.exec(protectedText))) {
    const start = powers.lastIndex;
    const end = protectedText[start] === "(" ? closingParen(protectedText, start) + 1
      : start + (protectedText.slice(start).match(/^[A-Za-z0-9_]+/)?.[0].length || 0);
    if (end === start) continue;
    const replacement = protect(protectedText.slice(match.index, end));
    protectedText = protectedText.slice(0, match.index) + replacement + protectedText.slice(end);
    powers.lastIndex = match.index + replacement.length;
  }
  protectedText = protectedText.replace(/\b(?:e|pi)\b/g, protect);
  const candidates = [nerdamer(protectedText)];
  for (const direction of ["sin", "cos"]) {
    let expression = nerdamer(protectedText);
    try {
      for (let pass = 0; pass < 3; pass++) {
        for (const pair of trig.values()) {
          if (pair.sin && pair.cos) expression = expression.sub(`${pair[direction]}^2`, `1-${pair[direction === "sin" ? "cos" : "sin"]}^2`);
        }
        expression = nerdamer(expression.expand().simplify().toString());
        const num = expression.numerator().toString(), den = expression.denominator().toString();
        expression = nerdamer(`(${nerdamer(num).expand().simplify()})/(${nerdamer(den).expand().simplify()})`);
      }
      candidates.push(expression);
    } catch (_) { /* The unsimplified exact expression remains a valid candidate. */ }
  }
  let best = original;
  let bestCost = best.toTeX().length;
  for (let expression of candidates) {
    for (const [name, value] of atoms) expression = expression.sub(name, value);
    expression = rationalizeRoot(expression);
    const expanded = nerdamer(expression.toString()).expand();
    if (expanded.toTeX().length < expression.toTeX().length) expression = expanded;
    const cost = expression.toTeX().length;
    if (cost <= bestCost) { best = expression; bestCost = cost; }
  }
  // Rationalising a lone root is preferred even if TeX encoding is slightly longer.
  best = rationalizeRoot(best);
  const value = best.toString();
  if (cache.size > 1500) cache.clear();
  cache.set(text, value);
  return value;
}

// Rationalise a + b sqrt(n), without turning exact numbers into decimals.
function rationalizeRoot(expression) {
  const denominator = expression.denominator();
  const roots = [...new Set(denominator.toString().match(/sqrt\(\d+\)/g) || [])];
  if (roots.length !== 1) return expression;
  try {
    const root = roots[0], n = root.slice(5, -1);
    const a = denominator.sub(root, "0").toString();
    const b = nerdamer(`((${denominator})-(${a}))/(${root})`).expand().toString();
    if (!RATIONAL.test(a) || !RATIONAL.test(b)) return expression;
    const norm = nerdamer(`(${a})^2-(${b})^2*${n}`).toString();
    if (norm === "0") return expression;
    return nerdamer(`(${expression.numerator()})*((${a})-(${b})*${root})/(${norm})`).expand();
  } catch (_) { return expression; }
}

function normalizeInput(text) {
  const value = text.replace(/−/g, "-").replace(/π/g, "pi")
    .replace(/\bln\s*\(/g, "log(").replace(/√\s*\(/g, "sqrt(")
    .replace(/√\s*(\d+(?:\.\d+)?)/g, "sqrt($1)");
  if (!value.trim() || !/^[\dA-Za-z_+\-*/^().\s]+$/.test(value)) throw new Error("Invalid expression");
  const calls = /([a-zA-Z][a-zA-Z0-9_]*)\s*\(/g;
  let match;
  while ((match = calls.exec(value))) {
    if (!FUNCTIONS.has(match[1])) throw new Error("Unknown function");
    const end = closingParen(value, calls.lastIndex - 1);
    const argument = value.slice(calls.lastIndex, end);
    if (!nerdamer(argument).variables().length) {
      const number = realValue(argument);
      if (number === null || (match[1] === "sqrt" && number < 0) || (match[1] === "log" && number <= 0)) {
        throw new Error("Non-real expression");
      }
    }
  }
  const parsed = nerdamer(value);
  if (parsed.variables().includes("i") || (!parsed.variables().length && realValue(value) === null)) {
    throw new Error("Non-real expression");
  }
  return value;
}

export class SymbolicScalar {
  constructor(value) { this.expression = simplifyExactly(String(value)); }
  static from(value) { return value instanceof SymbolicScalar ? value : new SymbolicScalar(value); }
  static zero() { return new SymbolicScalar("0"); }
  static one() { return new SymbolicScalar("1"); }
  add(value) { return new SymbolicScalar(`(${this})+(${value})`); }
  sub(value) { return new SymbolicScalar(`(${this})-(${value})`); }
  mul(value) { return new SymbolicScalar(`(${this})*(${value})`); }
  div(value) {
    if (SymbolicScalar.from(value).isZero()) throw new Error("Division by zero");
    return new SymbolicScalar(`(${this})/(${value})`);
  }
  neg() { return new SymbolicScalar(`-(${this})`); }
  isNegative() { return this.expression.startsWith("-"); }
  abs() { return this.isNegative() ? this.neg() : this; }
  isZero() { return this.expression === "0"; }
  isOne() { return this.expression === "1"; }
  equals(value) { return this.sub(value).isZero(); }
  isProvablyNonZero() {
    const numeric = realValue(this.expression);
    return numeric !== null ? numeric !== 0 : /^e\^(?:[A-Za-z0-9_]+|\([^()]*\))$/.test(this.expression);
  }
  toString() { return this.expression; }
  toLatex() {
    return nerdamer(this.expression).toTeX().replace(/\\cdot\s*/g, "\\,")
      .replace(/\\mathrm\{sin\}/g, "\\sin").replace(/\\mathrm\{cos\}/g, "\\cos")
      .replace(/\\mathrm\{log\}/g, "\\ln");
  }
  toFactorLatex() {
    const latex = this.toLatex();
    let depth = 0;
    for (let i = 0; i < this.expression.length; i++) {
      const char = this.expression[i];
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (i > 0 && depth === 0 && (char === "+" || char === "-")) return `\\left(${latex}\\right)`;
    }
    return latex;
  }
}

function splitRow(line) {
  const entries = [];
  let depth = 0, entry = "";
  for (const char of line) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (depth < 0) throw new Error("Invalid expression");
    if (!depth && /[\s,;]/.test(char)) {
      if (entry) entries.push(entry);
      entry = "";
    } else entry += char;
  }
  if (depth !== 0) throw new Error("Invalid expression");
  if (entry) entries.push(entry);
  return entries;
}

export function analyzeSymbolicInverseInput(input, lang = "fr") {
  try {
    const lines = input.split("\n").map(line => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error("Empty matrix");
    const rows = lines.map(splitRow);
    if (rows.some(row => row.length !== rows.length)) throw new Error("Square matrix required");
    const expressions = rows.map(row => row.map(normalizeInput));
    const words = expressions.flat().join(" ").match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const hasParameters = words.some(word => !FUNCTIONS.has(word) && !["e", "pi"].includes(word));
    const matrix = expressions.map(row => row.map(value => new SymbolicScalar(value)));
    const result = runMatrixInversion({ matrix });
    nerdamer.clear("all");
    return { ...result, hasParameters };
  } catch (error) {
    nerdamer.clear("all");
    throw new Error(lang === "en"
      ? "Enter a square matrix with valid real expressions (sqrt, sin, cos, exp, ln)."
      : "Saisissez une matrice carrée avec des expressions réelles valides (sqrt, sin, cos, exp, ln).");
  }
}
