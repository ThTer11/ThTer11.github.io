import { normalizeCalculusInput, parseCalculusExpression, calculusExpressionToLatex } from "./calculus";

const number = (value) => ({ type: "number", value });
const binary = (operator, left, right) => ({ type: "binary", operator, left, right });
const hasConstant = (n) => n.type === "symbol" ? n.name === "c"
  : n.type === "binary" ? hasConstant(n.left) || hasConstant(n.right)
    : n.type === "unary" ? hasConstant(n.value) : n.type === "call" ? hasConstant(n.argument) : false;

// ODE-specific convention: t is the variable; other letters are arbitrary parameters.
// e^... denotes Euler's number. Use exp(...) if e itself names the parameter.
export function parseOdeAnswer(value) {
  const names = new Set();
  const normalized = normalizeCalculusInput(value);
  const source = normalized.replace(/[a-z][a-z0-9_]*/g, (word, offset) => {
    if (["sin", "cos", "exp", "ln", "log", "sqrt", "abs", "pi"].includes(word)) return word;
    const pieces = word.match(/exp|sin|cos|sqrt|abs|ln|log|pi|[a-z]|[0-9]+|_/g) ?? [];
    return pieces.map((piece, index) => {
      if (piece === "t" || piece.length > 1 && /^[a-z]+$/.test(piece)) return piece;
      if (piece === "e" && index === pieces.length - 1 && normalized.slice(offset + word.length).trimStart().startsWith("^")) return "e";
      if (!/^[a-z]$/.test(piece)) throw new Error("parameter");
      names.add(piece);
      return "c";
    }).join("*");
  });
  if (names.size > 1) throw new Error("parameters");
  return { ast: parseCalculusExpression(source), parameter: [...names][0] ?? null };
}

export function odeAnswerToLatex(value) {
  const { ast, parameter } = parseOdeAnswer(value);
  return calculusExpressionToLatex(ast).replace(/C/g, parameter ? parameter.toUpperCase() : "C");
}

/** Evaluate both value and t-derivative by automatic differentiation. */
export function evaluateOdeExpression(node, t, constant = 0) {
  if (typeof node === "string") node = parseCalculusExpression(node);
  if (node.type === "number") return [node.value, 0];
  if (node.type === "symbol") return node.name === "t" ? [t, 1]
    : node.name === "e" ? [Math.E, 0] : node.name === "pi" ? [Math.PI, 0]
      : node.name === "c" ? [constant, 0] : [NaN, NaN];
  if (node.type === "unary") {
    const result = evaluateOdeExpression(node.value, t, constant);
    return node.operator === "-" ? result.map((v) => -v) : result;
  }
  if (node.type === "binary") {
    const [a, da] = evaluateOdeExpression(node.left, t, constant), [b, db] = evaluateOdeExpression(node.right, t, constant);
    if (node.operator === "+") return [a + b, da + db];
    if (node.operator === "-") return [a - b, da - db];
    if (node.operator === "*") return [a * b, da * b + a * db];
    if (node.operator === "/") return b === 0 ? [NaN, NaN] : [a / b, (da * b - a * db) / b ** 2];
    const v = a ** b;
    if (db === 0) return [v, b === 0 ? 0 : b * a ** (b - 1) * da];
    return a > 0 ? [v, v * (db * Math.log(a) + b * da / a)] : [NaN, NaN];
  }
  const [a, da] = evaluateOdeExpression(node.argument, t, constant);
  if (node.name === "sin") return [Math.sin(a), Math.cos(a) * da];
  if (node.name === "cos") return [Math.cos(a), -Math.sin(a) * da];
  if (node.name === "exp") return [Math.exp(a), Math.exp(a) * da];
  if (node.name === "ln") return a > 0 ? [Math.log(a), da / a] : [NaN, NaN];
  if (node.name === "sqrt") return a > 0 ? [Math.sqrt(a), da / (2 * Math.sqrt(a))] : [NaN, NaN];
  if (node.name === "abs") return [Math.abs(a), a === 0 ? NaN : Math.sign(a) * da];
  return [NaN, NaN];
}

// Structural affine dependence prevents incomplete families such as exp(C)h or C^2h.
function affineParts(n) {
  if (!hasConstant(n)) return [n, number(0)];
  if (n.type === "symbol") return [number(0), number(1)];
  if (n.type === "unary") return affineParts(n.value).map((value) => ({ ...n, value }));
  if (n.type !== "binary") throw new Error("affine");
  const [a, b] = affineParts(n.left), [c, d] = affineParts(n.right);
  if (["+", "-"].includes(n.operator)) return [binary(n.operator, a, c), binary(n.operator, b, d)];
  if (n.operator === "*" && !(hasConstant(n.left) && hasConstant(n.right))) {
    return [binary("*", a, c), hasConstant(n.left) ? binary("*", b, c) : binary("*", a, d)];
  }
  if (n.operator === "/" && !hasConstant(n.right)) return [binary("/", a, c), binary("/", b, c)];
  throw new Error("affine");
}

const near = (a, b) => Number.isFinite(a) && Number.isFinite(b)
  && Math.abs(a - b) <= 2e-7 * Math.max(1, Math.abs(a), Math.abs(b));

// Account for floating-point cancellation between y' and ay, without relaxing the
// error relative to the forcing term except for machine-roundoff-sized differences.
const residualMatches = (dy, ay, b) => [dy, ay, b].every(Number.isFinite)
  && Math.abs(dy + ay - b) <= 2e-7 * Math.max(1, Math.abs(b))
    + 32 * Number.EPSILON * (Math.abs(dy) + Math.abs(ay));

export function validateOdeAnswer(value, { question, lang = "fr" }) {
  const fail = (reason, fr, en, status = "incorrect") => ({ correct: false, status, reason, message: lang === "en" ? en : fr });
  try {
    const { ast, parameter } = parseOdeAnswer(value);
    const unique = question.conditionPoint !== undefined;
    if (unique && parameter) return fail("constant", "", "");
    if (!unique && !parameter) return fail("constant", "", "");
    let offset = ast, slope;
    if (!unique) {
      try { [offset, slope] = affineParts(ast); }
      catch { return fail("family", "", ""); }
    }
    const a = parseCalculusExpression(question.coefficient), b = parseCalculusExpression(question.forcing);
    const h = parseCalculusExpression(question.homogeneous);
    let ratio;
    for (const t of question.validationPoints) {
      const [y, dy] = evaluateOdeExpression(offset, t), [av] = evaluateOdeExpression(a, t), [bv] = evaluateOdeExpression(b, t);
      if (![y, dy, av, bv].every(Number.isFinite)) return fail("domain", "", "");
      if (!residualMatches(dy, av * y, bv)) return fail("equation", "", "");
      if (slope) {
        const [v, dv] = evaluateOdeExpression(slope, t), [hv] = evaluateOdeExpression(h, t), current = v / hv;
        if (!Number.isFinite(current) || current === 0 || !residualMatches(dv, av * v, 0)
          || (ratio !== undefined && !near(current, ratio))) return fail("family", "", "");
        ratio = current;
      }
    }
    if (unique && !near(evaluateOdeExpression(ast, question.conditionPoint)[0], question.conditionValue)) return fail("condition", "", "");
    return { correct: true, status: "correct" };
  } catch {
    return fail("syntax", "", "");
  }
}
