import { parseCalculusExpression, calculusExpressionToLatex } from "./calculus";

// Only generated expressions are simplified; a student's answer must retain its meaning.
function simplify(n) {
  const num = (value) => ({ type: "number", value });
  const is = (v, x) => v.type === "number" && v.value === x;
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return Math.abs(a); };
  // Restrict exact arithmetic to numeric literals (including simple fractions).
  // This avoids walking through arbitrary expression trees while still reducing
  // coefficients such as (5/3 + 1) to 8/3.
  const rational = (v) => {
    if (v.type === "number" && Number.isInteger(v.value)) return [v.value, 1];
    if (v.type !== "binary") return null;
    if (v.operator === "/" && v.left.type === "number" && v.right.type === "number" && Number.isInteger(v.left.value) && Number.isInteger(v.right.value) && v.right.value !== 0) {
      return [v.left.value, v.right.value];
    }
    return null;
  };
  const combineRationals = (left, right, operator) => {
    const a = rational(left), b = rational(right);
    if (!a || !b) return null;
    const [numeratorA, denominatorA] = a, [numeratorB, denominatorB] = b;
    if (operator === "+") return [numeratorA * denominatorB + numeratorB * denominatorA, denominatorA * denominatorB];
    if (operator === "-") return [numeratorA * denominatorB - numeratorB * denominatorA, denominatorA * denominatorB];
    if (operator === "*") return [numeratorA * numeratorB, denominatorA * denominatorB];
    if (operator === "/" && numeratorB !== 0) return [numeratorA * denominatorB, denominatorA * numeratorB];
    return null;
  };
  const rationalNode = (pair) => {
    if (!pair) return null;
    let [numerator, denominator] = pair;
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) return null;
    if (denominator < 0) { numerator *= -1; denominator *= -1; }
    const divisor = gcd(numerator, denominator); numerator /= divisor; denominator /= divisor;
    return denominator === 1 ? num(numerator) : { type: "binary", operator: "/", left: num(numerator), right: num(denominator) };
  };
  const negate = (value) => {
    if (value.type === "number") return num(-value.value);
    if (value.type === "unary" && value.operator === "-") return value.value;
    if (value.type === "binary" && value.operator === "*") {
      return simplify({ ...value, left: negate(value.left) });
    }
    if (value.type === "binary" && value.operator === "/") {
      return simplify({ ...value, left: negate(value.left) });
    }
    return { type: "unary", operator: "-", value };
  };
  const withoutLeadingMinus = (value) => {
    if (value.type === "number" && value.value < 0) return num(-value.value);
    if (value.type === "unary" && value.operator === "-") return value.value;
    if (value.type === "binary" && value.operator === "/" && value.left.type === "number" && value.left.value < 0) {
      return { ...value, left: num(-value.left.value) };
    }
    if (value.type === "binary" && value.operator === "*") {
      const positiveLeft = withoutLeadingMinus(value.left);
      return positiveLeft ? { ...value, left: positiveLeft } : null;
    }
    return null;
  };
  if (n.type === "unary") {
    const value = simplify(n.value);
    return n.operator === "+" ? value : negate(value);
  }
  if (n.type === "call") {
    const argument = simplify(n.argument);
    if (is(argument, 0) && ["exp", "sin", "cos"].includes(n.name)) return num(n.name === "sin" ? 0 : 1);
    if (n.name === "ln" && is(argument, 1)) return num(0);
    if (n.name === "exp") return { type: "binary", operator: "^", left: { type: "symbol", name: "e" }, right: argument };
    return { ...n, argument };
  }
  if (n.type !== "binary") return n;
  const left = simplify(n.left), right = simplify(n.right), op = n.operator;
  if (op === "^" && right.type === "number" && Number.isInteger(right.value) && right.value < 0) {
    return simplify({ type: "binary", operator: "/", left: num(1), right: { type: "binary", operator: "^", left, right: num(-right.value) } });
  }
  const exact = rationalNode(combineRationals(left, right, op));
  if (exact) return exact;
  if (left.type === "number" && right.type === "number") {
    const v = op === "+" ? left.value + right.value : op === "-" ? left.value - right.value : op === "*" ? left.value * right.value : op === "/" ? left.value / right.value : left.value ** right.value;
    if (Number.isSafeInteger(v)) return num(v);
  }
  if (op === "+" && is(left, 0)) return right;
  if (["+", "-"].includes(op) && is(right, 0)) return left;
  if (op === "-" && left.type === "number" && right.type === "binary" && right.operator === "+") {
    if (right.right.type === "number") {
      return simplify({ type: "binary", operator: "+", left: negate(right.left), right: num(left.value - right.right.value) });
    }
    if (right.left.type === "number") {
      return simplify({ type: "binary", operator: "+", left: negate(right.right), right: num(left.value - right.left.value) });
    }
  }
  if (op === "*" && (is(left, 0) || is(right, 0))) return num(0);
  if (op === "*" && is(left, 1)) return right;
  if (op === "*" && right.type === "unary" && right.operator === "-") return simplify({ ...n, left: negate(left), right: right.value });
  if (op === "*" && right.type === "binary" && right.operator === "/" && is(right.left, 1)) {
    return simplify({ type: "binary", operator: "/", left, right: right.right });
  }
  if (["*", "/", "^"].includes(op) && is(right, 1)) return left;
  if (op === "*" && is(left, -1)) return simplify({ type: "unary", operator: "-", value: right });
  if (op === "+") {
    const positiveRight = withoutLeadingMinus(right);
    if (positiveRight) return { type: "binary", operator: "-", left, right: positiveRight };
  }
  if (op === "-") {
    const positiveRight = withoutLeadingMinus(right);
    if (positiveRight) return { type: "binary", operator: "+", left, right: positiveRight };
  }
  if (op === "/" && right.type === "number" && right.value < 0) return simplify({ type: "binary", operator: "/", left: { type: "unary", operator: "-", value: left }, right: num(-right.value) });
  return { ...n, left, right };
}

export function formatGeneratedOdeExpression(expression) {
  return calculusExpressionToLatex(simplify(parseCalculusExpression(String(expression))))
    .replaceAll("\\cdot ", "")
    .replace(/\+\s+\\left\\((-?[0-9]+)\\\right\\)/g, "-\$1")
    .replace(/\+\s+-/g, "-")
    .replace(/(^|[=+])-([0-9]+)(?=\\mathrm\{e\}|[a-z])/g, "\$1-\$2")
    .replace(/\\frac\{-([0-9]+)\}\{([0-9]+)\}/g, "-\\frac{$1}{$2}")
    .replace(/\\left\((-?\d+)\\right\)\\mathrm\{e\}/g, "$1\\mathrm{e}");
}
